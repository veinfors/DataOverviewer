define( [
    "jquery",
    'qlik',
    './utils'
], function ( $, qlik, utils ) {

    'use strict';

    var noop = function () {};

    /* Private functions */

    function isDimension( field ) {

        if ( this.fieldsAsDimension.contains( field.qName ) ) {
            return true;
        } else if ( this.fieldsAsMeasure.contains( field.qName ) ) {
            return false;
        }

        var isDim = false;

        field.qTags.forEach( function( value ) {

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
            "qHyperCubeDef":{},
            "qInfo":{"qType":"mashup",
            "qId": 'id-' + Date.now() }
        }, function ( reply, app ) {
            app.getObject( reply.qInfo.qId ).then( function ( model ) {
                model.getProperties().then( function () {
                    self.sessionCube = model;
                    model.Invalidated.unbind(); // only once!
                    window.debugCubeNbr = 0;
                    self.proceedUpdate();
                });
            } );
        } );
    }

    function updateCubeProps ( sessionCube, newCubeProps, updated ) {

        $.extend( sessionCube.properties.qHyperCubeDef, newCubeProps, true );

        sessionCube.save().then( function () {
            sessionCube.getLayout().then( function ( cubeLayout ) {
                updated( cubeLayout );
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

        var dimName = this.matrix[dimIndex].name;

        var newCubeProps = {
            qDimensions: [ {
                "qDef": {
                    "qFieldDefs": [dimName],
                    autoSort: true
                },
                "qNullSuppression": true
            } ],
            qMeasures: [],
            qSuppressMissing: true,
            qAlwaysFullyExpanded: true,
            debugCubeNbr: ++window.debugCubeNbr
        };

        for ( var i = this.rect.top; i < this.rect.top + this.rect.height; i++ ) {
            if ( dataInvalidated || this.granularity !== this.matrix[dimIndex].measures[i].granularity ) {

                var measureName = this.matrix[dimIndex].measures[i].name;

                newCubeProps.qMeasures.push( {
                    measureIndex: i,
                    "qDef": {
                        "autoSort": true,
                        "qDef": this.aggrFunc + "([" + measureName + "])"

                    }
                } );
            }
        }

        var self = this;

        if ( newCubeProps.qMeasures.length ) {
            updateCubeProps( this.sessionCube, newCubeProps, function ( cubeLayout ) {
                fetchCubeData.call( self, newCubeProps, cubeLayout, dimIndex, dataInvalidated );
            } );
        } else {
            getReducedDataForDimension.call( this, dimIndex + 1, dataInvalidated );
        }
    }

    function fetchCubeData ( newCubeProps, cubeLayout, dimIndex, dataInvalidated ) {

        var self = this,
            pages = [{
                qTop: 0,
                qLeft: 0,
                qWidth: newCubeProps.qMeasures.length + 1,
                qHeight: this.granularity//500
            }];

        self.sessionCube.rpc( "GetHyperCubeReducedData", "qDataPages", ['/qHyperCubeDef', pages, -1, "D1"]).then( function ( p ) {
        //self.sessionCube.rpc( "GetHyperCubeData", "qDataPages", ["/qHyperCubeDef", pages]).then( function ( p ) {

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

    function update ( newRect, newGranularity, drawCallback, dataInvalidated ) {

        this.drawCallback = drawCallback;

        if ( this.sessionCube ) {
            proceedUpdate.call( this );
        } else {
            this.proceedUpdate = proceedUpdate.bind( this );
        }

        function proceedUpdate () {

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
                getReducedDataForDimension.call( this, this.rect.left, dataInvalidated );
            } else if ( this.fetchInProgress ) {

                // Note: cancelling ongoing requests are not fully supported - therefore wait for ongoing requests to finish
                // Will await ongoing dimension fetch before starting to fetch new data

                self.cancelling = function () {
                    self.cancelling = null;
                    self.rect = self.nextRect; // Careful! extend object?
                    self.granularity = self.nextGranularity;
                    // Start new fetch!
                    getReducedDataForDimension.call( self, self.rect.left, dataInvalidated );
                };

            }
        }
    }

    /**
     * Verifies if master item (dim or meas.) is included in properties
     * @param currentList
     * @param item
     */
    function isIncludedInList ( currentList, item ) {

        for ( var i = 0; i < currentList.length; i++ ) {
            if ( currentList[i].qInfo.qId === item.qInfo.qId ) {
                return true;
            }
        }

        return false;

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

        /*if ( utils.isInEditState() && this.objectModel.layout.permissions.update ) {

            var self = this;

            this.objectModel.getProperties().then( function ( props ) {
                props.fieldsAsMeasure = self.fieldsAsMeasure;
                props.fieldsAsDimension = self.fieldsAsDimension;
                self.objectModel.save();
            } );
        }*/
    };

    // This is only supported "on the fly" - not persisted in properties
    DataHandler.prototype.measureToDim = function ( measureName ) {

        if ( this.fieldsAsMeasure.contains( measureName ) ) {
            this.fieldsAsMeasure.splice( this.fieldsAsMeasure.indexOf( measureName ), 1 );
        }

        if ( !this.fieldsAsDimension.contains( measureName ) ) {
            this.fieldsAsDimension.push( measureName );
        }

        /*if ( utils.isInEditState() && this.objectModel.layout.permissions.update ) {

            var self = this;

            this.objectModel.getProperties().then( function ( props ) {
                props.fieldsAsMeasure = self.fieldsAsMeasure;
                props.fieldsAsDimension = self.fieldsAsDimension;
                self.objectModel.save();
            } );
        }*/
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
            fieldsSettings = this.objectModel.layout.fields;

        if ( fieldsSettings && fieldsSettings.auto ) {
            utils.subscribeFieldUpdates( function ( data, initialFetch ) {
                var responseTime = Date.now() - startTime;

                self.fields = data;
                self.populateDataMatrix();

                if ( initialFetch ) {
                    self.optimizer.updateNetworkSpeedParam( responseTime ); // this is only done once, and the nbr of fields aren't taken into account
                    callback();
                }
            } );
        } else {
            self.populateDataMatrix();
            callback();
        }



    };

    DataHandler.prototype.clearMatrix = function () {
        this.matrix.length = 0;
    };

    DataHandler.prototype.clearMatrixData = function () {

        var i, j, matrix = this.matrix;

        for ( i = 0; i <  matrix.length; i++ ) {
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
            fieldsSettings = this.objectModel.layout.fields;

        if ( fieldsSettings && fieldsSettings.auto ) {
            this.fields.qFieldList.qItems.forEach( function( item ) {

                if ( isDimension.call( self, item ) ) {
                    self.matrix.push( { name: item.qName, measures: [] } );
                } else {
                    measures.push( { name: item.qName, aggrFunc: item.aggrFunc, data: [] } );
                }
            } );
        } else {
            var listProps = this.objectModel.layout.fields;


            if ( listProps.x && listProps.y ) {
                listProps.x.forEach( function ( item ) {
                    self.matrix.push( { libraryId: item.id, title: item.title, measures: [] } );
                } );

                listProps.y.forEach( function ( item ) {
                    measures.push( { libraryId: item.id, title: item.title, aggrFunc: item.aggrFunc, data: [] } );
                } );
            }
        }

        self.matrix.forEach( function ( dimension ) {
            dimension['measures'] = [];
            measures.forEach( function ( measure ) {
                dimension['measures'].push( measure );
            } );
        } );


    };

    return DataHandler;

} );