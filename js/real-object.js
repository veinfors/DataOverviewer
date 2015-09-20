define( [
    "qlik"
], function ( qlik ) {

    var animationTime = 400;

    /* Private functions */

    function createDimensionObject ( dimensionName ) {

        var dimensionObj = {
            "qDef": {
                "qGrouping": "N",
                "qFieldDefs": [dimensionName],
                "qFieldLabels": [""],
                "qNumberPresentations": [],
                "qActiveField": 0,
                "autoSort": true
            }
        };

        return dimensionObj;
    }

    function createMeasureObject ( aggrFunc, measureName ) {

        var measureObj = measure = {
            "qDef": {
                "autoSort": true,
                "qDef": aggrFunc + '([' + measureName + '])'
            }
        };

        return measureObj;
    }

    function getDefaultLinechartProps ( id, dimensionObject, measureObject ) {

        var props = {
            "qInfo": {
                "qId": id,
                "qType": "linechart"
            },
            "qMetaDef": {

            },
            "qHyperCubeDef": {
                "qDimensions": [dimensionObject],
                "qMeasures": [measureObject],
                "qInterColumnSortOrder": [0, 1],
                "qSuppressMissing": true,
                "qInitialDataFetch": [{
                    "qLeft": 0,
                    "qTop": 0,
                    "qWidth": 17,
                    "qHeight": 500
                }],
                "qReductionMode": "N",
                "qMode": "S",
                "qPseudoDimPos": -1,
                "qNoOfLeftDims": -1,
                "qAlwaysFullyExpanded": true,
                "qMaxStackedCells": 5000,
                "qLayoutExclude": {
                    "qHyperCubeDef": {
                        "qDimensions": [],
                        "qMeasures": [],
                        "qInterColumnSortOrder": [],
                        "qInitialDataFetch": [],
                        "qReductionMode": "N",
                        "qMode": "S",
                        "qPseudoDimPos": -1,
                        "qNoOfLeftDims": -1,
                        "qMaxStackedCells": 5000
                    }
                }
            },
            "refLine": {
                "refLines": []
            },
            "metadata": {
                "name": "",
                "description": "",
                "tags": []
            },
            "showTitles": true,
            "title": "",
            "subtitle": "",
            "footnote": "",
            "lineType": "line",
            "stackedArea": false,
            "separateStacking": true,
            "nullMode": "gap",
            "dataPoint": {
                "show": false,
                "showLabels": false
            },
            "gridLine": {
                "auto": true,
                "spacing": 2
            },
            "color": {
                "auto": true,
                "mode": "primary",
                "singleColor": 3,
                "persistent": false,
                "expressionIsColor": true,
                "expressionLabel": "",
                "measureScheme": "sg",
                "reverseScheme": false,
                "dimensionScheme": "12",
                "autoMinMax": true,
                "measureMin": 0,
                "measureMax": 10
            },
            "legend": {
                "show": false,
                "dock": "auto",
                "showTitle": true
            },
            "dimensionAxis": {
                "show": "all",
                "label": "auto",
                "dock": "near"
            },
            "measureAxis": {
                "show": "all",
                "dock": "near",
                "spacing": 1,
                "autoMinMax": true,
                "minMax": "min",
                "min": 0,
                "max": 10,
                "logarithmic": false
            },
            "visualization": "linechart",
            "version": 0.96
        };

        return props;

    }

    function getDefaultBarchartProps ( id, dimensionObject, measureObject ) {

        var props = {
            "qInfo": {
                "qId": id,
                "qType": "barchart"
            },
            "qMetaDef": {

            },
            "qHyperCubeDef": {
                "qDimensions": [dimensionObject],
                "qMeasures": [measureObject],
                "qInterColumnSortOrder": [0, 1],
                "qSuppressMissing": true,
                "qInitialDataFetch": [{
                    "qLeft": 0,
                    "qTop": 0,
                    "qWidth": 17,
                    "qHeight": 500
                }],
                "qReductionMode": "N",
                "qMode": "S",
                "qPseudoDimPos": -1,
                "qNoOfLeftDims": -1,
                "qAlwaysFullyExpanded": true,
                "qMaxStackedCells": 5000,
                "qLayoutExclude": {
                    "qHyperCubeDef": {
                        "qDimensions": [],
                        "qMeasures": [],
                        "qInterColumnSortOrder": [],
                        "qInitialDataFetch": [],
                        "qReductionMode": "N",
                        "qMode": "S",
                        "qPseudoDimPos": -1,
                        "qNoOfLeftDims": -1,
                        "qMaxStackedCells": 5000
                    }
                }
            },
            "refLine": {
                "refLines": []
            },
            "metadata": {
                "name": "",
                "description": "",
                "tags": []
            },
            "showTitles": true,
            "title": "",
            "subtitle": "",
            "footnote": "",
            "barGrouping": {
                "grouping": "grouped"
            },
            "orientation": "vertical",
            "gridLine": {
                "auto": true,
                "spacing": 2
            },
            "dataPoint": {
                "showLabels": false
            },
            "color": {
                "auto": true,
                "mode": "primary",
                "singleColor": 3,
                "persistent": false,
                "expressionIsColor": true,
                "expressionLabel": "",
                "measureScheme": "sg",
                "reverseScheme": false,
                "dimensionScheme": "12",
                "autoMinMax": true,
                "measureMin": 0,
                "measureMax": 10,
                "dimensionId": ""
            },
            "legend": {
                "show": false,
                "dock": "auto",
                "showTitle": true
            },
            "dimensionAxis": {
                "show": "all",
                "label": "auto",
                "dock": "near"
            },
            "measureAxis": {
                "show": "all",
                "dock": "near",
                "spacing": 1,
                "autoMinMax": true,
                "minMax": "min",
                "min": 0,
                "max": 10
            },
            "visualization": "barchart",
            "version": 0.96
        };

        return props;

    }

    function createObjectElement ( animPoint ) {

        var objectElem = document.createElement( 'div' );

        objectElem.className = "real-object";
        this.$element.find( '.dataoverviewer' ).append( objectElem );

        this.objectElem = objectElem;

        if ( !animPoint ) { // Do not animate!
            objectElem.style.cssText = 'height: 100%; width: 100%; top: 0; left: 0';
            return;
        }

        this.animPosition = {
            x: animPoint.x,
            y: animPoint.y
        };

        objectElem.style.cssText = 'top: ' + animPoint.y + 'px; left: ' + animPoint.x + 'px;';

        setTimeout( function () {
            objectElem.style.cssText = 'height: 100%; width: 100%; top: 0; left: 0';
        }, 10 );
    }

    function createObject ( chartType, aggrFunc, dimensionName, measureName ) {

        this.dimensionName = dimensionName || this.dimensionName;
        this.measureName = measureName || this.measureName;
        this.currentObjectId = 'id-' + Date.now();

        var self = this,
            id = this.currentObjectId,
            app = app = qlik.currApp( this ),
            objProps,
            dimensionObject = createDimensionObject( this.dimensionName ),
            measureObject = createMeasureObject( aggrFunc, this.measureName );

        if ( chartType === 'bar' ) {
            objProps = getDefaultBarchartProps( id, dimensionObject, measureObject );
        } else {
            objProps = getDefaultLinechartProps( id, dimensionObject, measureObject );
        }

        app.model.createSessionObject( objProps ).then(
            function success() {
                app.getObject( self.objectElem, id ).then( function () {
                    activateSnapshottingOfObject.call( self );
                })
            }
        );

    }

    function activateSnapshottingOfObject() {

        var $objectElem = this.$element.find( '.real-object .qv-object' ),
            gridScope = this.$scope,
            objectScope = $objectElem.scope();

        this.gridLayoutRef = gridScope.object.layout;
        // Make sure object gets correct opacity (not grayed out)
        $objectElem.css( 'opacity', 1 );

        // Make sure snapshot counter works - yes, this is an ugly hack

        var self = this;

        objectScope.$$childHead.object.loaded.then( function () {

            // Switch layout temporarily go get the snapshot we want
            self.object = objectScope.$$childHead.object;
            self.object.ext.snapshot.canTakeSnapshot = false;

            self.object.layout.qInfo.qId = gridScope.object.layout.qInfo.qId;

            gridScope.object.layout = gridScope.object.model.layout = gridScope.ext.model.layout = self.object.layout;

        } );
    }

    function inactivateSnapshottingOfObject() {

        var gridScope = this.$scope;

        this.$scope.ext.snapshot.canTakeSnapshot = true;
        gridScope.object.layout = gridScope.object.model.layout = gridScope.ext.model.layout = this.gridLayoutRef;
    }

    /* Class */

    var realObject = function ( $scope, $element ) {

        this.$element = $element;
        this.$scope = $scope;
    };

    realObject.prototype.create = function ( chartType, aggrFunc, dimension, measure, animPoint ) {

        this.chartType = chartType;

        createObjectElement.call( this, animPoint );

        var self = this;

        setTimeout( function () {
            self.visible = self.$scope.realObjectVisible = true;
            createObject.call( self, chartType, aggrFunc, dimension, measure );
        }, animPoint ? animationTime : 0 );

    };

    realObject.prototype.close = function () {

        if ( this.currentObjectId ) {
            inactivateSnapshottingOfObject.call( this );
            var app = app = qlik.currApp( this );
            app.destroySessionObject( this.currentObjectId );
        }

        this.visible = this.$scope.realObjectVisible = false;
        this.chartType = null;

        this.objectElem.style.cssText += 'height: 100%; width: 100%; top: calc(-50% + ' + this.animPosition.y + 'px); left: calc(-50% + ' + this.animPosition.x
            + 'px); -webkit-transform: scale(0); -moz-transform: scale(0); -ms-transform: scale(0); -o-transform: scale(0); transform: scale(0);';

        var self = this;

        setTimeout( function () {
            self.objectElem.parentNode.removeChild( self.objectElem );
        }, animationTime );
    };

    realObject.prototype.destroy = function () {

        if ( this.currentObjectId ) {
            inactivateSnapshottingOfObject.call( this );
            var app = app = qlik.currApp( this );
            app.destroySessionObject( this.currentObjectId );
        }

        this.visible = this.$scope.realObjectVisible = false;
        this.chartType = null;
    };

    realObject.prototype.updateChartType = function ( newChartType ) {

        if ( newChartType !== this.chartType ) {
            this.chartType = newChartType;
            createObject.call( this, newChartType );
        }
    };

    return realObject;
} );