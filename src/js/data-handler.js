define( [
    'qlik',
    './utils'
], function ( qlik, utils ) {

    'use strict';

    var noop = function () {};

    var PIE_MEASURE_EXPR = "=concat(aggr(if(rank({{aggr_func}}([{{measure}}]),4)<=" + ( utils.PIE_CHART_OTHERS_LIMIT + 1 ) + ",{{aggr_func}}([{{measure}}])),[{{dimension}}]),';')&'-'&{{aggr_func}}(TOTAL [{{measure}}])";

    /* Private functions */

    function isDimension ( field ) {

        if ( this.fieldsAsDimension.contains( field.qName ) ) {
            return true;
        } else if ( this.fieldsAsMeasure.contains( field.qName ) ) {
            return false;
        }

        var isDim = false;

        field.qTags.forEach( function ( value ) {

            //if ( value === '$ascii' || value === '$text' || value === '$key' || value === '$timestamp' || value === '$date' ) {
            if ( value.match( /^(\$ascii|\$text|\$key|\$timestamp|\$date|\$geopolygon)$/ ) ) {
                isDim = true;
            }
        } );

        if ( !field.qTags.length ) {
            isDim = true;
        }

        return isDim;
    }

    // Create a session based (transient) cube to allow property update and no persistance
    function createCube () {

        var self = this,
            app = qlik.currApp( this );

        app.createGenericObject( {
            "qHyperCubeDef": {},
            "qInfo": {
                "qType": "mashup",
                "qId": 'id-' + Date.now()
            }
        }, function ( reply, app ) {
            app.getObject( reply.qInfo.qId ).then( function ( model ) {
                model.getProperties().then( function () {
                    self.sessionCube = model;
                    model.Invalidated.unbind(); // only once!
                    self.proceedUpdate();
                } );
            } );
        } );
    }

    function updateCubeProps ( sessionCube, newCubeProps, updated ) {


        sessionCube.getProperties().then( function ( props ) {

            $.extend( props.qHyperCubeDef, newCubeProps, true );

            sessionCube.setProperties( props ).then( function () {
                sessionCube.getLayout().then( function ( cubeLayout ) {
                    updated( cubeLayout );
                } );
            } );
        } );

    }

    // Iterate through all dimensions and add the data to "matrix" - then call drawCallback
    function getReducedDataForDimension ( dimIndex, dataInvalidated ) {

        this.fetchInProgress = true;

        if ( this.cancelling || dimIndex >= this.rect.left + this.rect.width ) {
            this.fetchInProgress = false;
            if ( this.cancelling ) {
                this.cancelling();
            }
            return;
        }

        var dimName = this.matrix[dimIndex].name,
            dimLibraryId = this.matrix[dimIndex].libraryId;

        var newCubeProps = {
            qDimensions: [{
                qLibraryId: dimLibraryId,
                qDef: {
                    qFieldDefs: dimName ? [dimName] : [],
                    autoSort: true
                },
                qNullSuppression: true
            }],
            qMeasures: [],
            qSuppressMissing: true,
            qAlwaysFullyExpanded: true
        };

        for ( var i = this.rect.top; i < this.rect.top + this.rect.height; i++ ) {
            if ( dataInvalidated || this.granularity !== this.matrix[dimIndex].measures[i].granularity ) {

                var measureName = this.matrix[dimIndex].measures[i].name,
                    measureAggrFunc = this.matrix[dimIndex].measures[i].aggrFunc || this.aggrFunc,
                    measureLibraryId = this.matrix[dimIndex].measures[i].libraryId;

                newCubeProps.qMeasures.push( {
                    qLibraryId: measureLibraryId || undefined,
                    measureIndex: i,
                    qDef: {
                        "autoSort": true,
                        qDef: measureName ? measureAggrFunc + "([" + measureName + "])" : undefined
                    }
                } );
            }
        }

        var self = this;

        if ( newCubeProps.qMeasures.length ) {
            updateCubeProps( this.sessionCube, newCubeProps, function ( cubeLayout ) {
                fetchReducedDataForOneDim.call( self, newCubeProps, cubeLayout, dimIndex, dataInvalidated );
            } );
        } else {
            getReducedDataForDimension.call( this, dimIndex + 1, dataInvalidated );
        }
    }

    function prepPieMeasureExpression ( aggrFunc, measure, dimension ) {

        var expression = PIE_MEASURE_EXPR;

        expression = expression.replace(/\{\{aggr_func\}\}/g, aggrFunc );
        expression = expression.replace(/\{\{measure\}\}/g, measure );
        expression = expression.replace(/\{\{dimension\}\}/g, dimension );

        return expression;
    }

    // Iterate through all measures and add the data to "matrix" - then call drawCallback
    function getPieDataForDimension ( dimIndex, dataInvalidated ) {

        this.fetchInProgress = true;

        if ( this.cancelling || dimIndex >= this.rect.left + this.rect.width ) {
            this.fetchInProgress = false;
            if ( this.cancelling ) {
                this.cancelling();
            }
            return;
        }

        var dummyDimExpression = "ValueList('dummy')",
            dimName = this.matrix[dimIndex].name,
            dimLibraryId = this.matrix[dimIndex].libraryId;

        var newCubeProps = {
            qDimensions: [{
                qDef: {
                    qFieldDefs: [dummyDimExpression]
                }
            }],
            qMeasures: [],
            qSuppressMissing: true,
            qAlwaysFullyExpanded: true
        };

        var measureName, measureAggrFunc, measureLibraryId, measureExpression;

        for ( var i = this.rect.top; i < this.rect.top + this.rect.height; i++ ) {
            if ( dataInvalidated || this.granularity !== this.matrix[dimIndex].measures[i].granularity ) {

                measureName = this.matrix[dimIndex].measures[i].name;
                measureAggrFunc = this.matrix[dimIndex].measures[i].aggrFunc || this.aggrFunc;
                measureLibraryId = this.matrix[dimIndex].measures[i].libraryId;

                measureExpression = prepPieMeasureExpression( measureAggrFunc, measureName || measureLibraryId, dimName || dimLibraryId );

                newCubeProps.qMeasures.push( {
                    measureIndex: i,
                    qDef: {
                        qDef: measureExpression
                    }
                } );
            }
        }

        var self = this;

        if ( newCubeProps.qMeasures.length ) {
            updateCubeProps( this.sessionCube, newCubeProps, function ( cubeLayout ) {
                fetchPieDataForOneDim.call( self, newCubeProps, cubeLayout, dimIndex, dataInvalidated );
            } );
        } else {
            getPieDataForDimension.call( this, dimIndex + 1, dataInvalidated );
        }
    }

    function fetchReducedDataForOneDim ( newCubeProps, cubeLayout, dimIndex, dataInvalidated ) {

        var self = this,
            pages = [{
                qTop: 0,
                qLeft: 0,
                qWidth: newCubeProps.qMeasures.length + 1,
                qHeight: this.granularity//500
            }];

        // Keep 2 variants for backwards compatibility (old Qlik Sense versions)
        var reducedDataPromise = self.sessionCube.rpc ? self.sessionCube.rpc( "GetHyperCubeReducedData", "qDataPages", ['/qHyperCubeDef', pages, -1, "D1"] )
            : self.sessionCube.getHyperCubeReducedData( "/qHyperCubeDef", pages, -1, "D1" );

        reducedDataPromise.then( function ( p ) {

            // Add to matrix

            for ( var i = 0; i < newCubeProps.qMeasures.length; i++ ) {

                var index = newCubeProps.qMeasures[i].measureIndex;

                self.matrix[dimIndex].measures[index]['data'] = [];
                self.matrix[dimIndex].measures[index]['granularity'] = self.granularity;

                self.matrix[dimIndex].measures[index]['max'] = cubeLayout.qHyperCube.qMeasureInfo[i].qMax;
                self.matrix[dimIndex].measures[index]['min'] = cubeLayout.qHyperCube.qMeasureInfo[i].qMin;

                for ( var j = 0; j < p[0].qMatrix.length; j++ ) {
                    self.matrix[dimIndex].measures[index].data.push( [p[0].qMatrix[j][0], p[0].qMatrix[j][i + 1]] );
                }
            }

            // Keep fetching...
            self.drawCallback( self.matrix, self.rect );
            getReducedDataForDimension.call( self, dimIndex + 1, dataInvalidated );
        } );
    }

    function fetchPieDataForOneDim ( newCubeProps, cubeLayout, dimIndex, dataInvalidated ) {

        var self = this,
            pages = [{
                qTop: 0,
                qLeft: 0,
                qWidth: newCubeProps.qMeasures.length + 1,
                qHeight: this.granularity//500
            }];

        var dataPromise = self.sessionCube.getHyperCubeData( "/qHyperCubeDef", pages );

        dataPromise.then( function ( p ) {

            // Add to matrix

            var index, result, textValues, total, dataPoints;

            for ( var i = 0; i < newCubeProps.qMeasures.length; i++ ) {

                index = newCubeProps.qMeasures[i].measureIndex;

                result = p[0].qMatrix[0][i].qText.split( "-" );

                dataPoints = result[0].split( ";" ).map( function ( value ) {
                    return parseFloat( value );
                } );

                dataPoints.sort( function ( a, b ) {
                    return b - a;
                } );

                self.matrix[dimIndex].measures[index]['data'] = dataPoints;

                total = parseFloat( result[1] );

                self.matrix[dimIndex].measures[index]['total'] = total;

                self.matrix[dimIndex].measures[index]['granularity'] = self.granularity;
            }

            // Keep fetching...
            self.drawCallback( self.matrix, self.rect );
            getPieDataForDimension.call( self, dimIndex + 1, dataInvalidated );
        } );
    }

    function update ( newRect, newGranularity, drawCallback, dataInvalidated, chartType ) {

        this.drawCallback = drawCallback;

        if ( this.sessionCube ) {
            proceedUpdate.call( this );
        } else {
            this.proceedUpdate = proceedUpdate.bind( this );
        }

        function proceedUpdate () {

            var self = this;

            this.proceedUpdate = noop;

            this.nextRect = newRect;
            this.nextGranularity = newGranularity;

            if ( this.cancelling ) {
                // Only update rect and granularity
                return;
            } else if ( !this.fetchInProgress ) {
                // start new fetch
                this.rect = newRect; // Careful! extend object?
                this.granularity = newGranularity;
                if ( chartType === "pie" ) {
                    getPieDataForDimension.call( this, this.rect.top, dataInvalidated );
                } else {
                    getReducedDataForDimension.call( this, this.rect.left, dataInvalidated );
                }
            } else if ( this.fetchInProgress ) {

                // Will await ongoing dimension fetch before starting to fetch new data

                self.cancelling = function () {
                    self.cancelling = null;
                    self.rect = self.nextRect; // Careful! extend object?
                    self.granularity = self.nextGranularity;
                    // Start new fetch!
                    if ( chartType === "pie" ) {
                        getPieDataForDimension.call( self, self.rect.left, dataInvalidated );
                    } else {
                        getReducedDataForDimension.call( self, self.rect.left, dataInvalidated );
                    }
                };

            }
        }
    }

    /* Class */

    var DataHandler = function ( optimizer, doHelper, objectModel, isSnapshot, snapshotData, aggrFunc ) {

        this.optimizer = optimizer;
        this.objectModel = objectModel;
        this.proceedUpdate = noop;
        this.cancelling = null;
        this.isSnapshot = isSnapshot;
        this.aggrFunc = aggrFunc;

        if ( isSnapshot ) {
            this.matrix = snapshotData.renderingInfo.dataMatrix;
        } else {
            this.matrix = [];
            createCube.call( this );
        }

        this.fetchInProgress = false;
        this.rect = null;
        this.granularity = null;

        this.fieldsAsDimension = [];
        this.fieldsAsMeasure = [];
        this.insufficientFields = false;

        this.throttledUpdate = doHelper.throttle( update, 200 );
    };

    // This is only supported "on the fly" - not persisted in properties
    DataHandler.prototype.dimToMeasure = function ( dimName ) {

        if ( this.fieldsAsDimension.contains( dimName ) ) {
            this.fieldsAsDimension.splice( this.fieldsAsDimension.indexOf( dimName ), 1 );
        }

        if ( !this.fieldsAsMeasure.contains( dimName ) ) {
            this.fieldsAsMeasure.push( dimName );
        }
    };

    // This is only supported "on the fly" - not persisted in properties
    DataHandler.prototype.measureToDim = function ( measureName ) {

        if ( this.fieldsAsMeasure.contains( measureName ) ) {
            this.fieldsAsMeasure.splice( this.fieldsAsMeasure.indexOf( measureName ), 1 );
        }

        if ( !this.fieldsAsDimension.contains( measureName ) ) {
            this.fieldsAsDimension.push( measureName );
        }
    };

    /**
     * returns fields, dimensions and measures and populates the data matrix with it according to properties
     * @param callback
     * @returns {*}
     */
    DataHandler.prototype.fetchAllFields = function ( callback ) {

        if ( this.isSnapshot ) {
            callback();
            return;
        }

        var self = this,
            startTime = Date.now();

        utils.subscribeFieldUpdates( function ( data, initialFetch ) {
            var responseTime = Date.now() - startTime;

            self.fields = data;
            self.populateDataMatrix();

            if ( initialFetch ) {
                self.optimizer.updateNetworkSpeedParam( responseTime ); // this is only done once, and the nbr of fields aren't taken into account
                callback();
            }
        } );
    };

    DataHandler.prototype.clearMatrix = function () {
        this.matrix.length = 0;
    };

    DataHandler.prototype.clearMatrixData = function () {

        var i, j, matrix = this.matrix;

        for ( i = 0; i < matrix.length; i++ ) {
            for ( j = 0; j < matrix[i].measures.length; j++ ) {
                delete matrix[i].measures[j].granularity;
                matrix[i].measures[j].data = [];
            }
        }
    };

    DataHandler.prototype.setAggrFunc = function ( func ) {

        this.aggrFunc = func;
    };

    DataHandler.prototype.populateDataMatrix = function () {

        var self = this,
            measures = [],
            fieldProps = this.objectModel.layout.fields;

        // Support old objects missing fields settings
        if ( !fieldProps || fieldProps.auto ) {
            this.fields.qFieldList.qItems.forEach( function ( item ) {

                if ( isDimension.call( self, item ) ) {
                    self.matrix.push( { name: item.qName, measures: [] } );
                } else {
                    measures.push( { name: item.qName, data: [] } );
                }
            } );
        } else {

            if ( fieldProps.x && fieldProps.y ) {
                fieldProps.x.forEach( function ( item ) {
                    self.matrix.push( { libraryId: item.id, title: item.title, name: item.name, measures: [] } );
                } );

                fieldProps.y.forEach( function ( item ) {
                    measures.push( {
                        libraryId: item.id,
                        title: item.title,
                        name: item.name,
                        aggrFunc: item.aggrFunc,
                        data: []
                    } );
                } );
            }
        }

        // Sort dimensions and measures
        self.matrix.sort( utils.sortFields );
        measures.sort( utils.sortFields );

        self.matrix.forEach( function ( dimension ) {
            dimension['measures'] = [];
            measures.forEach( function ( measure ) {
                dimension['measures'].push( {
                    libraryId: measure.libraryId,
                    title: measure.title,
                    name: measure.name,
                    aggrFunc: measure.aggrFunc,
                    data: []
                } );
            } );
        } );

        self.insufficientFields = !self.matrix.length || !self.matrix[0].measures.length;

    };

    DataHandler.prototype.destroy = function () {

        // Destroy session objects to unsubscribe from data updates
        if ( this.sessionCube ) {
            qlik.currApp().destroySessionObject( this.sessionCube.id );
        }

        if ( this.fields ) {
            qlik.currApp().destroySessionObject( this.fields.qInfo.qId );
        }
    };

    return DataHandler;

} );