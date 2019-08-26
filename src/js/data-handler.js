define( [
    'qlik',
    './utils'
], function ( qlik, utils ) {

    'use strict';

    var noop = function () {};

    var PIE_MEASURE_EXPR = "=concat(num(aggr(if(rank({{aggr_func}}({{measure}}),4)<=" + ( utils.PIE_CHART_OTHERS_LIMIT ) + ",{{aggr_func}}({{measure}})),[{{dimension}}])),';')";
    //var PIE_TOTALS_ATTR_EXPR = "=if({{aggr_func}}([{{measure}}])>0,{{aggr_func}}(TOTAL aggr({{aggr_func}}([{{measure}}]),[{{dimension}}])))";
    //var PIE_TOTALS_ATTR_EXPR = "={{aggr_func}}(if(3 > 2, TOTAL aggr({{aggr_func}}([{{measure}}]),[{{dimension}}])))";

    // &'' in the end of attribute expressions to get the same number formatting as in the expression (needed for comparison...)
    //var PIE_OTHERS_ATTR_EXP = "={{aggr_func}}(aggr(if(num(rank({{aggr_func}}([{{measure}}]),4))>" + ( utils.PIE_CHART_OTHERS_LIMIT - 1 ) + ",{{aggr_func}}([{{measure}}])),[{{dimension}}]))&''";
    var PIE_OTHERS_ATTR_EXP = "=if((nullcount([{{dimension}}])+count([{{dimension}}]))=" + utils.PIE_CHART_OTHERS_LIMIT + ",0,sum(aggr(if(num(rank({{aggr_func}}({{measure}}),4))>" + ( utils.PIE_CHART_OTHERS_LIMIT - 1 ) + ",{{aggr_func}}({{measure}})),[{{dimension}}])))&''";

    //var PIE_TOTALS_ATTR_EXPR = "=num(aggr(if(not IsNull([{{dimension}}]) and rank({{aggr_func}}([{{measure}}]),4)>" + ( utils.PIE_CHART_OTHERS_LIMIT ) + ",{{aggr_func}}([{{measure}}])),[{{dimension}}]))";

    //var PIE_TOTALS_ATTR_EXPR = "=if({{aggr_func}}([{{measure}}])>0,rangesum(aggr({{aggr_func}}([{{measure}}]),[{{dimension}}])))";
    var PIE_NULLSUM_ATTR_EXPR = "=num(aggr(if(IsNull([{{dimension}}]),{{aggr_func}}({{measure}})),[{{dimension}}]))&''";

    /* Private functions */

    function isDimension ( field ) {

        if ( this.fieldsAsDimension.includes( field.qName ) ) {
            return true;
        } else if ( this.fieldsAsMeasure.includes( field.qName ) ) {
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

    function getNullDataPointIndex ( dataPoints, nullSum ) {

        var index = -1;

        if ( nullSum ) {
            // Note: iterate backards - That will mimic the pie chart in sense - placing null last of equally sized siblings...
            for ( var i = dataPoints.length - 1; i >= 0; i-- ) {
                if ( dataPoints[i].value === nullSum ) {
                    index = i;
                    break;
                }
            }
        }

        return index;

    }

    // Create a session based (transient) cube to allow property update and no persistance
    function createCube () {

        var self = this,
            app = qlik.currApp( this ),
            objectModel;

        app.createGenericObject( {
            "qHyperCubeDef": {},
            "qInfo": {
                "qType": "mashup",
                "qId": 'id-' + Date.now()
            }
        }, function ( reply, app ) {
            app.getObject( reply.qInfo.qId ).then( function ( model ) {
                objectModel = typeof model.getProperties === "function" ? model : model.model; // Backwards compatibility

                objectModel.getProperties().then( function () {
                    self.sessionCube = objectModel;
                    objectModel.Invalidated.unbind(); // only once!
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
                }
            }],
            qMeasures: [],
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
        expression = expression.replace(/\{\{measure\}\}/g, aggrFunc ? '[' + measure + ']' : measure );
        expression = expression.replace(/\{\{dimension\}\}/g, dimension );

        return expression;
    }

    function prepPieMeasureAttrOthersExpr ( aggrFunc, measure, dimension ) {

        var attrExpression = PIE_OTHERS_ATTR_EXP;

        attrExpression = attrExpression.replace(/\{\{aggr_func\}\}/g, aggrFunc );
        attrExpression = attrExpression.replace(/\{\{measure\}\}/g, aggrFunc ? '[' + measure + ']' : measure );
        attrExpression = attrExpression.replace(/\{\{dimension\}\}/g, dimension );

        return attrExpression;
    }

    function prepPieMeasureAttrNullSumExpr ( aggrFunc, measure, dimension ) {

        var attrExpression = PIE_NULLSUM_ATTR_EXPR;

        attrExpression = attrExpression.replace(/\{\{aggr_func\}\}/g, aggrFunc );
        attrExpression = attrExpression.replace(/\{\{measure\}\}/g, aggrFunc ? '[' + measure + ']' : measure );
        attrExpression = attrExpression.replace(/\{\{dimension\}\}/g, dimension );

        return attrExpression;
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

        var measureName, measureAggrFunc, measureLibraryId, measureExpression, othersAttributeExpression, nullSumAttrExpression, measureDef;

        for ( var i = this.rect.top; i < this.rect.top + this.rect.height; i++ ) {
            if ( dataInvalidated || this.granularity !== this.matrix[dimIndex].measures[i].granularity ) {

                measureName = this.matrix[dimIndex].measures[i].name;
                measureLibraryId = this.matrix[dimIndex].measures[i].libraryId;
                if ( measureLibraryId ) {
                    measureAggrFunc = '';
                    measureDef = measureLibraryId = this.matrix[dimIndex].measures[i].measure.qDef;
                } else {
                    measureAggrFunc = this.matrix[dimIndex].measures[i].aggrFunc || this.aggrFunc;
                }

                measureExpression = prepPieMeasureExpression( measureAggrFunc, measureName || measureDef, dimName || dimLibraryId );
                othersAttributeExpression = prepPieMeasureAttrOthersExpr( measureAggrFunc, measureName || measureDef, dimName || dimLibraryId );
                nullSumAttrExpression = prepPieMeasureAttrNullSumExpr( measureAggrFunc, measureName || measureDef, dimName || dimLibraryId );

                newCubeProps.qMeasures.push( {
                    measureIndex: i,
                    qDef: {
                        qDef: measureExpression
                    },
                    qAttributeExpressions: [
                        {
                            qExpression: othersAttributeExpression
                        },
                        {
                            qExpression: nullSumAttrExpression
                        }
                    ],
                    qIsAutoFormat: false
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

            var index, nullSum, dataPoints, nullDataPointIndex, othersSum, qText, total;

            for ( var i = 0; i < newCubeProps.qMeasures.length; i++ ) {

                total = 0;

                index = newCubeProps.qMeasures[i].measureIndex;

                qText = p[0].qMatrix[0][i].qText;

                dataPoints = [];

                if ( qText ) {
                    dataPoints = qText.split( ";" ).map( function ( value ) {
                        return {
                            isNull: false,
                            value: parseFloat( value )
                        };
                    } );
                }

                dataPoints.sort( function ( a, b ) {
                    return utils.sort( b.value, a.value );
                } );

                othersSum = parseFloat( p[0].qMatrix[0][i].qAttrExps.qValues[0].qNum ) || 0;

                if ( othersSum ) {
                    dataPoints.pop();
                }

                nullSum = parseFloat( p[0].qMatrix[0][i].qAttrExps.qValues[1].qNum ) || 0;
                nullDataPointIndex = getNullDataPointIndex( dataPoints, nullSum );

                if ( nullDataPointIndex > -1 ) {
                    dataPoints[nullDataPointIndex].isNull = true;
                }

                dataPoints.forEach( function ( d ) {
                    total += d.value;
                } );

                total += othersSum;

                self.matrix[dimIndex].measures[index]['data'] = dataPoints;

                self.matrix[dimIndex].measures[index]['othersSum'] = othersSum;
                self.matrix[dimIndex].measures[index]['total'] = total;

                self.matrix[dimIndex].measures[index]['hasOthers'] = !!othersSum;
                self.matrix[dimIndex].measures[index]["hasNullsWithinLimit"] = nullDataPointIndex > -1;

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
                    getPieDataForDimension.call( this, this.rect.left, dataInvalidated );
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

        if ( this.fieldsAsDimension.includes( dimName ) ) {
            this.fieldsAsDimension.splice( this.fieldsAsDimension.indexOf( dimName ), 1 );
        }

        if ( !this.fieldsAsMeasure.includes( dimName ) ) {
            this.fieldsAsMeasure.push( dimName );
        }
    };

    // This is only supported "on the fly" - not persisted in properties
    DataHandler.prototype.measureToDim = function ( measureName ) {

        if ( this.fieldsAsMeasure.includes( measureName ) ) {
            this.fieldsAsMeasure.splice( this.fieldsAsMeasure.indexOf( measureName ), 1 );
        }

        if ( !this.fieldsAsDimension.includes( measureName ) ) {
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
            startTime = Date.now(),
            app = qlik.currApp( self );

        utils.subscribeFieldUpdates( app, function ( data, initialFetch ) {
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
                        measure: item.measure,
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
                    measure: measure.measure,
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