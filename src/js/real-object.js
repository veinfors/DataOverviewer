define( [
    "qlik"
], function ( qlik ) {

    var animationTime = 400;

    /* Private functions */

    function createDimensionObject ( dimension ) {

        var dimName = dimension.name,
            dimLibraryId = dimension.libraryId;

        var dimensionObj = {
            "qLibraryId": dimLibraryId || undefined,
            "qDef": {
                "qGrouping": "N",
                "qFieldDefs": dimName ? [dimName] : [],
                "qFieldLabels": [""],
                "qNumberPresentations": [],
                "qActiveField": 0,
                "autoSort": true
            }
        };

        return dimensionObj;
    }

    function createMeasureObject ( aggrFunc, measure ) {

        var measureName = measure.name,
            measureAggrFunc = measure.aggrFunc || aggrFunc,
            measureLibraryId = measure.libraryId;

        var measureObj = {
            "qLibraryId": measureLibraryId || undefined,
            "qDef": {
                "autoSort": true,
                "qDef": measureName ? measureAggrFunc + '([' + measureName + '])' : undefined
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
            "visualization": "linechart"
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
            "visualization": "barchart"
        };

        return props;

    }

    function getDefaultPiechartProps ( id, dimensionObject, measureObject ) {

        dimensionObject.qOtherTotalSpec = {
            "qOtherMode" : "OTHER_COUNTED",
                "qOtherCounted" : {
                "qv" : "10"
            },
            "qOtherLimit" : {
                "qv" : "0"
            },
            "qOtherLimitMode" : "OTHER_GE_LIMIT",
                "qForceBadValueKeeping" : true,
                "qApplyEvenWhenPossiblyWrongResult" : true,
                "qOtherSortMode" : "OTHER_SORT_DESCENDING",
                "qTotalMode" : "TOTAL_OFF",
                "qReferencedExpression" : {}
        };

        dimensionObject.qDef.othersLabel = "Others";

        dimensionObject.qDef.qSortCriterias = [{
            "qSortByAscii" : 1,
            "qSortByLoadOrder" : 1,
            "qExpression" : {}
        }];

        dimensionObject.qAttributeDimensions = [{
            "qDef": dimensionObject.qDef.qFieldDefs[0],
            "qSortBy": {
                "qSortByAscii": 1,
                "qExpression": {}
            },
            "id": "colorByAlternative",
            "label": dimensionObject.qDef.qFieldDefs[0]
        }];

        measureObject.qSortBy = {
            "qSortByNumeric" : -1,
                "qSortByLoadOrder" : 1,
                "qExpression" : {}
        };

        var props = {
            "qInfo" : {
                "qId" : id,
                "qType" : "piechart"
            },
            "qMetaDef" : {},
            "qHyperCubeDef" : {
                "qDimensions": [dimensionObject],
                "qMeasures": [measureObject],
                "qInterColumnSortOrder" : [1, 0],
                "qSuppressMissing" : true,
                "qInitialDataFetch" : [{
                    "qLeft" : 0,
                    "qTop" : 0,
                    "qWidth" : 10,
                    "qHeight" : 500
                }
                ],
                "qReductionMode" : "N",
                "qMode" : "S",
                "qPseudoDimPos" : -1,
                "qNoOfLeftDims" : -1,
                "qMaxStackedCells" : 5000,
                "qCalcCond" : {},
                "qTitle" : {},
                "customErrorMessage" : {
                    "calcCond" : ""
                },
                "qLayoutExclude" : {
                    "qHyperCubeDef" : {
                        "qDimensions" : [],
                        "qMeasures" : [],
                        "qInterColumnSortOrder" : [],
                        "qInitialDataFetch" : [],
                        "qReductionMode" : "N",
                        "qMode" : "S",
                        "qPseudoDimPos" : -1,
                        "qNoOfLeftDims" : -1,
                        "qMaxStackedCells" : 5000,
                        "qCalcCond" : {},
                        "qTitle" : {}
                    }
                }
            },
            "showTitles" : true,
            "title" : "",
            "subtitle" : "",
            "footnote" : "",
            "showDetails" : false,
            "donut" : {
                "showAsDonut" : false
            },
            "dimensionTitle" : true,
            "dataPoint" : {
                "auto" : true,
                "labelMode" : "share"
            },
            "color" : {
                "auto" : false,
                "mode" : "byDimension",
                "useBaseColors" : "off",
                "paletteColor" : {
                    "index" : 6
                },
                "persistent" : false,
                "useDimColVal" : true,
                "expressionIsColor" : true,
                "expressionLabel" : "",
                "measureScheme" : "sg",
                "reverseScheme" : false,
                "dimensionScheme" : "12",
                "autoMinMax" : true,
                "measureMin" : 0,
                "measureMax" : 10,
                /*"byDimDef" : {
                    "label" : "[Address Number Header]",
                    "key" : "[Address Number Header]",
                    "type" : "expression"
                },
                "altLabel" : "[Address Number Header]"*/
            },
            "legend" : {
                "show" : false,
                "dock" : "auto",
                "showTitle" : true
            },
            "visualization" : "piechart"
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

    function createObject ( chartType, aggrFunc, chartInfo ) {

        this.dimension = chartInfo ? chartInfo.dimension : this.dimension;
        this.measure = chartInfo ? chartInfo.measure : this.measure;
        this.currentObjectId = 'id-' + Date.now();

        var self = this,
            id = this.currentObjectId,
            app = app = qlik.currApp( this ),
            objProps,
            dimensionObject = createDimensionObject( this.dimension ),
            measureObject = createMeasureObject( aggrFunc, this.measure );

        if ( chartType === 'bar' ) {
            objProps = getDefaultBarchartProps( id, dimensionObject, measureObject );
        } else if ( chartType === 'line' ) {
            objProps = getDefaultLinechartProps( id, dimensionObject, measureObject );
        } else {
            objProps = getDefaultPiechartProps( id, dimensionObject, measureObject );
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

            // backwards compatibility (older versions of qlik sense)
            if ( self.object.ext.snapshot ) {
                self.object.ext.snapshot.canTakeSnapshot = false;
            } else if ( self.object.ext.support ) {
                self.object.ext.support.snapshot = false;
            }

            self.object.layout.qInfo.qId = gridScope.object.layout.qInfo.qId;

            gridScope.object.layout = gridScope.object.model.layout = gridScope.ext.model.layout = self.object.layout;

        } );
    }

    function inactivateSnapshottingOfObject() {

        var gridScope = this.$scope;

        // backwards compatibility (older versions of qlik sense)
        if ( this.$scope.ext.snapshot ) {
            this.$scope.ext.snapshot.canTakeSnapshot = true;
        } else if ( this.$scope.ext.support ) {
            this.$scope.ext.support.snapshot = true;
        }

        gridScope.object.layout = gridScope.object.model.layout = gridScope.ext.model.layout = this.gridLayoutRef;
    }

    /* Class */

    var realObject = function ( $scope, $element ) {

        this.$element = $element;
        this.$scope = $scope;
    };

    realObject.prototype.create = function ( chartType, aggrFunc, chartInfo, animPoint ) {

        this.chartType = chartType;

        createObjectElement.call( this, animPoint );

        var self = this;

        setTimeout( function () {
            self.visible = self.$scope.realObjectVisible = true;
            createObject.call( self, chartType, aggrFunc, chartInfo );

            // To make selections toolbar visible
            self.$element.find( '.dataoverviewer' ).css( 'overflow', 'visible' );
            self.$element.parents( '.qv-object, .qv-inner-object' ).css( 'overflow', 'visible' );
        }, animPoint ? animationTime : 0 );

    };

    realObject.prototype.close = function () {

        if ( this.currentObjectId ) {
            inactivateSnapshottingOfObject.call( this );
            var app = app = qlik.currApp( this );
            app.destroySessionObject( this.currentObjectId );
        }

        // Prevent field titles from overflowing
        this.$element.find( '.dataoverviewer' ).css( 'overflow', '' );
        this.$element.parents( '.qv-object, .qv-inner-object' ).css( 'overflow', '' );

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

        // Prevent field titles from overflowing
        this.$element.find( '.dataoverviewer' ).css( 'overflow', '' );
        this.$element.parents( '.qv-object, .qv-inner-object' ).css( 'overflow', '' );

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