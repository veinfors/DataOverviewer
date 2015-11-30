
define('text!html/template.html',[],function () { return '<div qv-extension class="dataoverviewer" ng-class="{\'interactive\': interactive, \'auto-mode\': autoMode, \'insufficient-fields\': dataHandler.insufficientFields }">\r\n\r\n\t<div class="dimension-titles-container" ng-show="!realObjectVisible" ng-style="dimensionTitlesPositioning" qva-context-menu="openContextMenu($event)">\r\n\t\t<span class="dimension-title" ng-repeat="dimension in dimensionTitles " title="{{dimension}}">{{dimension}}</span>\r\n\t</div>\r\n\t<div class="dimension-scrollbar" ng-style="dimensionScrollbar"></div>\r\n\t<div class="measure-titles-container" ng-show="!realObjectVisible" ng-style="measureTitlesPositioning" qva-context-menu="openContextMenu($event)">\r\n\t\t<span class="measure-title" ng-repeat="measure in measureTitles" title="{{measure}}">{{measure}}</span>\r\n\t</div>\r\n\t<div class="measure-scrollbar" ng-style="measureScrollbar"></div>\r\n\t<canvas class="grid-canvas" qva-activate="openRealObject($event)"></canvas>\r\n\r\n\t<button class="qui-plainbuttonicon settings-button" ng-if="!realObjectVisible && interactive" ng-class="{\'qui-active\': settingsOpen}" qva-activate="openSettings($event)" data-icon="V" title="Settings"></button>\r\n\t<button class="qui-plainbuttonicon reset-zoom" ng-if="!realObjectVisible && interactive" qva-activate="resetZoom()" data-icon="ü" title="Reset zoom"></button>\r\n\t<button class="qui-plainbuttonicon zoom-in" ng-if="!realObjectVisible && interactive" qva-activate="zoomIn()" data-icon="Y" title="Zoom in"></button>\r\n\t<button class="qui-plainbuttonicon zoom-out" ng-if="!realObjectVisible && interactive" qva-activate="zoomOut()" data-icon="Z" title="Zoom out"></button>\r\n\t<button class="qui-plainbuttonicon close-real-object" ng-if="realObjectVisible && interactive" qva-activate="closeRealObject()" data-icon="E" title="Close"></button>\r\n\r\n\t<div class="settings-container" ng-show="settingsOpen" qva-outside="closeSettings($event)">\r\n\t\t\t<button class="chart-type-bar chart-btn qui-plainbuttonicon" qva-activate="setChartType( \'bar\' )" data-icon="!" title="Bar chart"></button>\r\n\t\t\t<button class="chart-type-line chart-btn qui-plainbuttonicon" qva-activate="setChartType( \'line\' )" data-icon="%" title="Line chart"></button>\r\n\t\t\t<p class="do-props-aggr-picker-label" ng-if="autoMode">Aggregation function</p>\r\n\t\t\t<div class="qui-buttongroup aggr-btn-group" ng-if="autoMode">\r\n\t\t\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Sum\'}" qva-activate="setAggrFunc(\'Sum\')"><span>Sum</span></button>\r\n\t\t\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Avg\'}" qva-activate="setAggrFunc(\'Avg\')"><span>Avg</span></button>\r\n\t\t\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Count\'}" qva-activate="setAggrFunc(\'Count\')"><span>Count</span></button>\r\n\t\t\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Max\'}" qva-activate="setAggrFunc(\'Max\')"><span>Max</span></button>\r\n\t\t\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Min\'}" qva-activate="setAggrFunc(\'Min\')"><span>Min</span></button>\r\n\t\t\t</div>\r\n\t</div>\r\n\t<div class="do-needs-x-and-y-fields">Needs data on X and Y axis</div>\r\n</div>';});

define( 'js/utils',["qlik"],
function ( qlik ) {

    'use strict';

    var utils = {

        requestAnimFrame: window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( callback ){
            window.setTimeout( callback, 1000 / 60 );
        },

        isInSnapshotState: function () {
            return window.location.pathname.search(/\/state\/snapshot(?!\w)/) > -1;
        },

        isInEditState: function () {
            return window.location.pathname.search(/\/state\/edit(?!\w)/) > -1;
        },

        allowInteraction: function ( isSnapshot ) {

            // Do not allow interaction in snapshot state, when rendered as snapshot or in edit mode.
            return !utils.isInSnapshotState() && !isSnapshot && !utils.isInEditState();
        },

        /**
         * generic string sorter
         * @param a
         * @param b
         * @returns {number}
         */
        sort: function ( a, b ) {
            if ( a > b ) {
                return 1;
            }
            if ( a < b ) {
                return -1;
            }
            // a must be equal to b
            return 0;
        },

        sortFields: function ( a, b ) {
            return utils.sort( a.name || a.title, b.name || b.title );
        },

        getGranularity: function ( scaling ) {

            if ( scaling < 1.6 ) {
                return 15;
            } else if ( scaling > 1.6 && scaling < 3 ) {
                return 50;
            } else {
                return 100;
            }
        },

        /**
         * Notifies callback every time fields, dimensions or measures are changed + initial fetch
         * @param callback
         */
        subscribeFieldUpdates: function ( callback ) {

            var app = qlik.currApp( this ),
                initialFetch = true, // Used for perf optimization
                lastJSONString = '';

            return app.createGenericObject( {
                "qInfo": {
                    "qId": "",
                    "qType": "SessionLists"
                },
                "qFieldListDef": {
                    "qType": "field"
                },
                "qDimensionListDef": {
                    "qType": "dimension"
                },
                "qMeasureListDef": {
                    "qType": "measure"
                }
            }, function ( data ) {

                var newJSONString = JSON.stringify( data );

                // Do not call callback unless fields, dimensions or measures has actually changed
                // We come here on every app data change (selections...)
                if ( newJSONString === lastJSONString ) {
                    return;
                } else {
                    lastJSONString = newJSONString;

                    callback( data, initialFetch );
                    initialFetch = false;
                }
            } );
        }

    };

    return utils;

} );

define( 'js/data-handler',[
    'qlik',
    './utils'
], function ( qlik, utils ) {

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

        var dimName = this.matrix[dimIndex].name,
            dimLibraryId = this.matrix[dimIndex].libraryId;

        var newCubeProps = {
            qDimensions: [ {
                qLibraryId: dimLibraryId,
                qDef: {
                    qFieldDefs: dimName ? [dimName] : [],
                    autoSort: true
                },
                qNullSuppression: true
            } ],
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
            fieldProps = this.objectModel.layout.fields;

        // Support old objects missing fields settings
        if ( !fieldProps || fieldProps.auto ) {
            this.fields.qFieldList.qItems.forEach( function( item ) {

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
                    measures.push( { libraryId: item.id, title: item.title, name: item.name, aggrFunc: item.aggrFunc, data: [] } );
                } );
            }
        }

        // Sort dimensions and measures
        self.matrix.sort( utils.sortFields );
        measures.sort( utils.sortFields );

        self.matrix.forEach( function ( dimension ) {
            dimension['measures'] = [];
            measures.forEach( function ( measure ) {
                dimension['measures'].push( { libraryId: measure.libraryId, title: measure.title, name: measure.name, aggrFunc: measure.aggrFunc, data: [] } );
            } );
        } );

        self.insufficientFields = !self.matrix.length || !self.matrix[0].measures.length;

    };

    DataHandler.prototype.destroy = function () {

        // Destroy session objects to unsubscribe from data updates
        if ( this.sessionCube ) {
            this.sessionCube.close();
        }

        if ( this.fields ) {
            qlik.currApp().destroySessionObject( this.fields.qInfo.qId );
        }
    };

    return DataHandler;

} );
define( 'js/transform-tracker',[], function () {

    // Adds ctx.getTransform() - returns an SVGMatrix
    // Adds ctx.transformedPoint(x,y) - returns an SVGPoint
    var transformTracker = function ( ctx, /*initPosX, initPosY,*/ axisWidth ) {
        var svg,
            xform,
            savedTransforms = [];

        function init() {
            savedTransforms.length = 0;
            svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
            xform = svg.createSVGMatrix();

            ctx.setTransform( 1, 0, 0, 1, 0, 0 );
        }

        this.reset = init;

        // Store transformation info on ctx object
        ctx.canvasMatrix = xform;
        ctx.getScale = function () { return xform.a; };

        ctx.getTransform = function(){ return xform; };

        var save = ctx.save;
        ctx.save = function(){
            savedTransforms.push( xform.translate( 0, 0 ) );
            return save.call( ctx );
        };

        var restore = ctx.restore;
        ctx.restore = function() {
            xform = savedTransforms.pop();
            return restore.call( ctx );
        };

        var scale = ctx.scale;
        ctx.scale = function( sx, sy ) {
            xform = xform.scaleNonUniform( sx, sy );
            return scale.call( ctx, sx, sy );
        };

        var rotate = ctx.rotate;
        ctx.rotate = function( radians ) {
            xform = xform.rotate( radians * 180 / Math.PI );
            return rotate.call( ctx, radians );
        };

        var translate = ctx.translate;
        ctx.translate = function( dx, dy ) {
            xform = xform.translate( dx, dy );
            return translate.call( ctx, dx, dy );
        };

        init();

        var transform = ctx.transform;
        ctx.transform = function( a, b, c, d, e, f ) {
            var m2 = svg.createSVGMatrix();

            m2.a = a;
            m2.b = b;
            m2.c = c;
            m2.d = d;
            m2.e = e;
            m2.f = f;

            xform = xform.multiply( m2 );
            return transform.call( ctx, a, b, c, d, e, f );
        };

        var setTransform = ctx.setTransform;
        ctx.setTransform = function( a, b, c, d, e, f ){

            xform.a = a;
            xform.b = b;
            xform.c = c;
            xform.d = d;
            xform.e = e;
            xform.f = f;

            return setTransform.call( ctx, a, b, c, d, e, f );
        };

        var pt = svg.createSVGPoint();
        ctx.transformedPoint = function( x, y ){

            pt.x = x;
            pt.y = y;

            return pt.matrixTransform( xform.inverse() );
        };

        ctx.updateRefPoints = function () {

            this.canvasMatrix = xform;
            this.topLeft = ctx.transformedPoint( 0, 0 ); // Top left point of canvas
            this.bottomRight = ctx.transformedPoint( ctx.canvas.width, ctx.canvas.height ); // Bottom right point of canvas
            this.crossing = ctx.transformedPoint( 0, ctx.canvas.height ); // Crossing of dim. and measures (up to the left)
        };

    };

    return transformTracker;
} );
define( 'js/renderer',[
    'qlik',
    "./transform-tracker",
    "./utils"
], function ( qlik, TransformTracker, utils ) {

    'use strict';

    /* Static constants */
    var graphWidth = 120,
        graphHeight = 52,
        graphSpace = 60,
        barColor = '#35609B';

    /* Private functions */

    /**
     * Draws text message "No data" on canvas
     * @param ctx
     * @param x
     * @param y
     */
    function noChartData ( ctx, x, y ) {

        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "12px Verdana";
        ctx.fillText( "No data", x, y, graphWidth );
    }

    function drawBarChart ( ctx, gX, gY, dataPoints, measureMax, measureMin ) {

        var w,
            h,
            x,
            y,
            barSpace,
            dataPlotted = false,
            range,
            yCenter;

        if ( measureMax > 0 && measureMin > 0 ) {
            range = measureMax;
            yCenter = graphHeight;
        } else if ( measureMax < 0 && measureMin < 0) {
            range = -measureMin;
            yCenter = 0;
        } else {
            range = Math.abs( measureMax - measureMin );
            yCenter = Math.abs( measureMax ) > Math.abs( measureMin ) ? measureMax / range * graphHeight : ( 1 + ( measureMin / range ) ) * graphHeight;
        }

        for ( var k = 0; k < dataPoints.length; k++ ) {

            w = ( graphWidth * 0.6 ) / dataPoints.length;
            if ( w > graphWidth / 6 ) {
                w = graphWidth / 6;
            }

            barSpace = w / 1.5;

            h = Math.abs( dataPoints[k][1].qNum ) / range * graphHeight// + graphHeight - yCenter;
            h = !h || isNaN( h ) ? 1 : h; // This could be improved.. min height is 1 for now.
            x = gX + k * ( w + barSpace );
            y = dataPoints[k][1].qNum < 0 ? gY + yCenter : gY + yCenter - h;

            if ( range === 0 || isNaN( y ) ) {
                y = gY + ( graphHeight / 2 );
            }

            ctx.rect ( x, y, w, h );
            dataPlotted = true;
        }

        if ( !dataPlotted ) {
            noChartData( ctx, gX + graphWidth / 2, gY + graphHeight / 2 );
        }
    }

    function drawLineChart ( ctx, gX, gY, dataPoints, measureMax, measureMin ) {

        var w,
            x,
            y,
            range = Math.abs( measureMax - measureMin ),
            dataPlotted = false;

        if ( dataPoints.length === 1 && !isNaN( dataPoints[0][1].qNum ) ) {
            //draw a circle
            x = gX + graphWidth / 2;
            y = gY + graphHeight / 2;
            ctx.moveTo( x - 0.5, y );
            ctx.arc( x, y, 0.5, 0, Math.PI * 2, true );

            return;
        }

        for ( var k = 0; k < dataPoints.length; k++ ) {

            w = graphWidth / ( dataPoints.length - 1 );

            x = gX + k * w;
            y = gY + graphHeight - ( dataPoints[k][1].qNum - measureMin ) / range * graphHeight;

            // This happens when range === 0 - would result in no line drawn
            // Value can end up out of range because of how data reduction works in sense (approximation) - therefore limit to max/min
            if ( range === 0 || isNaN( y ) ) {
                y = gY + ( graphHeight / 2 );
            } else if ( dataPoints[k][1].qNum < measureMin ) {
                y = gY + graphHeight;
            } else if ( dataPoints[k][1].qNum > measureMax ) {
                y = gY;
            }

            if ( k === 0 || isNaN( dataPoints[k][1].qNum ) ) {
                ctx.moveTo( x, y );
            } else {
                ctx.lineTo( x, y );
                dataPlotted = true;
            }
        }

        if ( !dataPlotted ) {
            noChartData( ctx, gX + graphWidth / 2, gY + graphHeight / 2 );
        }

    }

    function drawChartIcon ( ctx, chartType, gX, gY ) {

        ctx.fillStyle = "#A5A5A5";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "50px QlikView Icons";

        var charCode;

        if ( chartType === 'bar' ) {
            charCode = '0x0021';
        } else if ( chartType === 'line' ) {
            charCode = '0x0025';
        }

        ctx.fillText( String.fromCharCode( charCode ), gX + graphWidth / 2, gY + graphHeight / 2 - 4 );
        ctx.fillStyle = barColor;
    }

    function drawGridLines ( ctx ) {

        var s = ctx.getScale(),
            area = this.visibleArea,
            x,
            y;

        ctx.beginPath();
        ctx.strokeStyle = 'gray';

        // Measure lines
        for ( var i = area.top; i < ( area.top + area.height ); i++ ) {
            y = i * graphHeight + ( i * graphSpace );// + ( graphHeight / 2 );

            ctx.moveTo( ctx.topLeft.x, y );
            ctx.lineTo( ( area.left + area.width ) * ( graphWidth + graphSpace ), y );
        }

        // Dimension lines
        for ( var i = area.left + 1; i <= ( area.left + area.width ); i++ ) {
            x = i * graphWidth + ( i * graphSpace );// + ( graphWidth / 2 ) + s;

            ctx.moveTo( x, 0 );
            ctx.lineTo( x, ctx.crossing.y );
        }

        ctx.stroke();
    }

    function drawFieldTitles ( scale, offsetX, offsetY ) {

        var s = this.chartScale, // = 1 if not snapshot
            dataMatrix = this.dataHandler.matrix,
            axisWidth = this.doHelper.axisWidth,
            gridHeight = scale * ( graphHeight + graphSpace ),
            gridWidth = scale * ( graphWidth + graphSpace ),
            dimensionMargin = gridWidth - axisWidth * 0.93, // titles has 93% width of "axis width"
            measureMargin = gridHeight - 20 * s,
            dimNbrOffset = Math.round( ( offsetX ) / gridWidth ),
            measNbrOffset = Math.ceil( offsetY / gridHeight ),
            gridsOutsideTop = measNbrOffset < 0 ? -measNbrOffset : 0,
            gridsOutsideLeft = dimNbrOffset < 0 ? -dimNbrOffset : 0,
            top = offsetY + gridHeight / 2 - 22 * s / 2 + gridsOutsideTop * gridHeight,
            left = offsetX + gridWidth / 2 - 100 * s / 2 + axisWidth + gridsOutsideLeft * gridWidth,
            areaHeight = this.$element.height() - axisWidth * 0.93,
            areaWidth = this.$element.width() - axisWidth,
            lastVisibleRow = Math.round( ( areaHeight - offsetY ) / gridHeight ),
            lastVisibleCol = Math.ceil( ( areaWidth - offsetX ) / gridWidth ),
            measure;

        lastVisibleRow = lastVisibleRow < dataMatrix[0].measures.length ? lastVisibleRow : dataMatrix[0].measures.length;
        lastVisibleCol = lastVisibleCol < dataMatrix.length ? lastVisibleCol : dataMatrix.length;

        // Decide which titles should be rendered
        this.dimensionTitles.length = 0;
        this.measureTitles.length = 0;

        for( var i = gridsOutsideLeft; i < lastVisibleCol; i++ ) {
            this.dimensionTitles.push( dataMatrix[i].name || dataMatrix[i].title );
        }

        for ( var i = gridsOutsideTop; i < lastVisibleRow; i++ ) {
            measure = dataMatrix[0].measures[i];
            if ( measure.name ) {
                this.measureTitles.push( measure.aggrFunc ? measure.aggrFunc + '(' + measure.name + ')' : measure.name );
            } else {
                this.measureTitles.push( measure.title );
            }
        }

        // Set styling to get the title positions correct
        this.measureTitlesPositioning['top'] = top + 'px';
        this.measureTitlesPositioning['width'] = axisWidth + 'px';
        this.measureTitlesPositioning['margin-bottom'] = measureMargin + 'px';

        this.dimensionTitlesPositioning['left'] = left + 'px';
        this.dimensionTitlesPositioning['width'] = axisWidth + 'px';
        this.dimensionTitlesPositioning['margin-right'] = dimensionMargin + 'px';
    }

    /**
     * Always keeps at least a part of top rightmost grid cell visible (to avoid user from getting lost while zooming and panning)
     */
    function limitPanning () {

        var dataMatrix = this.dataHandler.matrix,
            ctx = this.ctx,
            gridWidth = graphWidth + graphSpace,
            gridHeight = graphHeight + graphSpace;

        var topRightPoint = {
            x: gridWidth * ( dataMatrix.length - 0.5 ),
            y: gridHeight / 2
        };

        if ( topRightPoint.x < ctx.crossing.x ) {
            ctx.translate( ctx.crossing.x - topRightPoint.x, 0 );
            ctx.updateRefPoints();
        }

        if ( topRightPoint.y > ctx.crossing.y ) {
            ctx.translate( 0, ctx.crossing.y - topRightPoint.y );
            ctx.updateRefPoints();
        }
    }

    function updateVisibility () {

        var dataMatrix = this.dataHandler.matrix,
            s = this.ctx.getScale(), // scaling
            offsetX = this.ctx.canvasMatrix.e,
            offsetY = this.ctx.canvasMatrix.f,
            top = -Math.floor( ( offsetY + ( graphHeight + graphSpace ) * s ) / ( graphHeight + graphSpace ) / s ),
            left = -Math.floor( ( offsetX + ( graphWidth + graphSpace ) * s ) / ( graphWidth + graphSpace ) / s ),
            width = Math.ceil( ( this.ctx.canvas.clientWidth ) / ( s * ( graphWidth + graphSpace ) ) ) + 1,// +1 compensation...
            height = Math.ceil( this.ctx.canvas.clientHeight / ( s * ( graphHeight + graphSpace ) ) ) + 1;

        if ( left + width > dataMatrix.length ) {
            width = dataMatrix.length - left;
        }

        if ( top + height > dataMatrix[0].measures.length ) {
            height = dataMatrix[0].measures.length - top;
        }

        this.visibleArea = {
            top: top < 1 ? 0 : top, // never negative index
            left: left < 1 ? 0 : left, // never negative index
            width: left < 0 ? width + left : width,
            height: top < 0 ? height + top : height
        };
    }

    function drawCanvas() {

        var gX,
            gY,
            dataMatrix = this.dataHandler.matrix,
            ctx = this.ctx,
            s = ctx.getScale(),
            chartType = this.chartType,
            area = this.visibleArea,
            chartsAsIcons = Math.round( s * 100 ) / 100 < this.optimizer.zoomRenderLimit; // s in the matrix can have a lot of decimals (non uniform scaling...)

        if ( this.isSnapshot ) {
            chartsAsIcons = this.snapshotData.renderingInfo.chartsAsIcons;
        }

        ctx.lineWidth = 1 / s;

        // Clear the entire grid canvas
        ctx.clearRect( ctx.topLeft.x, ctx.topLeft.y, ctx.bottomRight.x - ctx.topLeft.x, ctx.bottomRight.y - ctx.topLeft.y );

        /* ----------- Draw the grid/lines ---------- */
        drawGridLines.call( this, ctx );

        /* ------------ Draw the charts ----------- */

        ctx.fillStyle = barColor;
        ctx.strokeStyle = barColor;
        ctx.lineWidth = 2 / s;
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for ( var i = area.left; i < ( area.left + area.width ); i++ ) { // Dimensions
            gX = i * graphWidth + i * graphSpace + graphSpace / 2;

            for ( var j = area.top; j < ( area.top + area.height ); j++ ) { // Measures

                var measure = dataMatrix[i].measures[j],
                    dataPoints = measure.data;

                gY = j * graphHeight + j * graphSpace + graphSpace / 2;

                //ctx.clearRect( gX - ( graphSpace / 4 ), gY - ( graphHeight / 2 ), graphWidth + graphSpace / 2, graphHeight + graphSpace / 2);

                //ctx.strokeStyle = 'green';
                //ctx.strokeRect( gX, gY, graphWidth, graphHeight);
                //ctx.strokeStyle = 'blue';

                if ( !chartsAsIcons && dataPoints.length ) {

                    if ( chartType === 'bar' ) {
                        drawBarChart( ctx, gX, gY, dataPoints, measure.max, measure.min );
                    } else if ( chartType === 'line' ) {
                        drawLineChart( ctx, gX, gY, dataPoints, measure.max, measure.min );
                    }
                } else {
                    drawChartIcon( ctx, chartType, gX, gY );
                }
            }
        }

        if ( chartType === 'bar' ) {
            ctx.fill();
        } if ( chartType === 'line' ) {
            ctx.stroke();
        }

        // Dimensions and measures title's

        drawFieldTitles.call( this, s, ctx.canvasMatrix.e, ctx.canvasMatrix.f );

        if ( !$( ctx.canvas ).scope().$root.$$phase ) {
            $( ctx.canvas ).scope().$digest();
        }
    }

    function scaleSnapshot ( $element, ctx, snapshotData ) {

        var m = snapshotData.renderingInfo.canvasMatrix;

        var origWidth = snapshotData.object.size.w,
            currentWidth = $element.width();

        if ( snapshotData.object.freeResize ) {
            this.doHelper.setChartScale( 1 );
        } else {
            this.doHelper.setChartScale( currentWidth / origWidth );
        }

        this.chartScale = this.doHelper.chartScale;

        ctx.setTransform( m.a * this.chartScale, m.b, m.c, m.d * this.chartScale, m.e * this.chartScale, m.f * this.chartScale );
    }

    function stepZoom ( ctx, zoomStep, xStep, yStep ) {

        var m1 = ctx.canvasMatrix,
            m2 = [ m1.a + zoomStep, 0, 0, m1.d + zoomStep, m1.e + xStep, m1.f + yStep ];

        ctx.setTransform( m2[0], m2[1], m2[2], m2[3], m2[4], m2[5] );
    }

    /* Class */

    var renderer = function ( $element, ctx, dataHandler, optimizer, chartType, dimensionTitles, measureTitles, dimensionTitlesPositioning, measureTitlesPositioning, doHelper, isSnapshot, snapshotData ) {

        this.$element = $element;
        this.ctx = ctx;
        this.dataHandler = dataHandler;
        this.optimizer = optimizer;
        this.chartType = chartType;
        this.dimensionTitles = dimensionTitles;
        this.measureTitles = measureTitles;
        this.dimensionTitlesPositioning = dimensionTitlesPositioning;
        this.measureTitlesPositioning = measureTitlesPositioning;
        this.doHelper = doHelper;
        this.isSnapshot = isSnapshot;
        this.snapshotData = snapshotData;
        this.chartScale = 1;
        this.initZoom = 1;
        this.animation = {};

        this.transformTracker = new TransformTracker( this.ctx, doHelper.axisWidth );

        if ( this.isSnapshot ) {
            scaleSnapshot.call( this, this.$element, this.ctx, this.snapshotData, this.doHelper );
        }
    };

    renderer.prototype.setChartType = function ( chartType ) { // Define as object property?
        this.chartType = chartType;
    };

    renderer.prototype.render = function ( dataInvalidated ) {

        if ( this.dataHandler.insufficientFields ) {
            return;
        }

        if ( this.isSnapshot ) {
            scaleSnapshot.call( this, this.$element, this.ctx, this.snapshotData, this.doHelper );
        }

        this.ctx.updateRefPoints();
        limitPanning.call( this );

        var s = this.ctx.getScale();
        var granularity = utils.getGranularity( this.isSnapshot ? this.snapshotData.renderingInfo.canvasMatrix.a : s );

        updateVisibility.call( this );

        drawCanvas.call( this );

        if ( !this.isSnapshot && s > this.optimizer.zoomDataLimit && !Object.keys( this.animation ).length ) {
            this.dataHandler.throttledUpdate( this.visibleArea, granularity, drawCanvas.bind( this ), dataInvalidated );
        }
    };

    renderer.prototype.resize = function () {

        if ( !this.isSnapshot ) {
            this.applyCanvasMatrix( this.ctx.canvasMatrix );
        }

        this.render();
    };

    renderer.prototype.applyCanvasMatrix = function ( canvasMatrix ) {

        var ctx = this.ctx,
            scale = canvasMatrix.a,
            panning = {
                x: ctx.canvasMatrix.e,
                y: ctx.canvasMatrix.f
            };

        this.transformTracker.reset();

        var centerPoint = ctx.transformedPoint( ctx.canvas.width / 2, ctx.canvas.height / 2 );

        ctx.translate( centerPoint.x, centerPoint.y );
        ctx.scale( scale, scale );
        ctx.translate( -centerPoint.x, -centerPoint.y );

        var panningOffset = ctx.transformedPoint( panning.x, panning.y );

        ctx.translate( panningOffset.x, panningOffset.y );
    };

    renderer.prototype.resetZoom = function () {

        var ctx = this.ctx,
            s = ctx.getScale(),
            initZoom = this.initZoom,
            animation = this.animation;

        // Prepare animation
        if ( !Object.keys( animation ).length ) {
            var steps = 15; // animation speed
            animation.zoomStep = ( initZoom - s ) / steps;
            animation.xStep = -ctx.canvasMatrix.e / steps;
            animation.yStep = -ctx.canvasMatrix.f / steps;
        }

        animation.zoomStep = Math.abs( s - initZoom ) > Math.abs( animation.zoomStep ) ? animation.zoomStep : 0;
        animation.xStep = Math.abs( ctx.canvasMatrix.e ) > Math.abs( animation.xStep ) ? animation.xStep : 0;
        animation.yStep = Math.abs( ctx.canvasMatrix.f ) > Math.abs( animation.yStep ) ? animation.yStep : 0;

        if ( animation.zoomStep !== 0 || animation.xStep !== 0 || animation.yStep !== 0 ) {
            utils.requestAnimFrame.call( window, this.resetZoom.bind( this ) );

            stepZoom( ctx, animation.zoomStep, animation.xStep, animation.yStep );

            this.render();
        } else {

            ctx.setTransform( initZoom, 0, 0, initZoom, 0, 0 );
            this.animation = {};
            this.render();
        }
    };

    renderer.prototype.getInfoFromPoint = function ( point ) {

        var gridHeight = graphHeight + graphSpace,
            gridWidth = graphWidth + graphSpace,
            transformedPoint = this.ctx.transformedPoint( point.x, point.y ),
            dimensionIndex = Math.floor( ( transformedPoint.x  ) / gridWidth),
            measureIndex = Math.floor( ( transformedPoint.y  ) / gridHeight );

        if ( this.dataHandler.matrix[dimensionIndex] && this.dataHandler.matrix[0].measures[measureIndex] ) {
            return {
                dimension: this.dataHandler.matrix[dimensionIndex],
                measure: this.dataHandler.matrix[0].measures[measureIndex]
            };
        } else {
            return null;
        }

    };

    renderer.prototype.getCanvasMatrix = function () {
        return this.ctx.canvasMatrix;
    };

    renderer.prototype.setOptimizedZoom = function ( center ) {

        if ( this.isSnapshot ) {
            return;
        }

        var optimizedZoom = this.optimizer.zoomRenderLimit,
            ctx = this.ctx;

        if ( center ) {

            var focusPoint = ctx.transformedPoint( ctx.canvas.width / 2, ctx.canvas.height / 2 );

            ctx.translate( focusPoint.x, focusPoint.y );
            ctx.scale( optimizedZoom / ctx.getScale(), optimizedZoom / ctx.getScale() );
            ctx.translate( -focusPoint.x, -focusPoint.y );
        } else {
            ctx.scale( optimizedZoom, optimizedZoom );
        }

        this.initZoom = ctx.getScale();

        this.ctx.updateRefPoints();
    };

    renderer.prototype.getGridSize = function () {

        var s = this.ctx.getScale(),
            nbrOfDimensions = this.dataHandler.matrix.length,
            nbrOfMeasures = this.dataHandler.matrix.length ? this.dataHandler.matrix[0].measures.length : 0,
            cellHeight = s * ( graphHeight + graphSpace ), // + s for grid lines?
            cellWidth = s * ( graphWidth + graphSpace );

        return {
            width: nbrOfDimensions * cellWidth,
            height: nbrOfMeasures * cellHeight
        };

    };

    renderer.prototype.isRendered = function () {
        return !!this.ctx.canvasMatrix;
    };

    return renderer;

} );
define( 'js/event-handler',[
    "./utils"
], function ( utils ) {

    /* Static */
    var zoomMinLimit = 0.5,
        zoomMaxLimit = 5,
        scaleFactor = 1.1;

    /* Private functions */

    function updateScrollBars () {
        var axisWidth = this.$scope.doHelper.axisWidth;

        var gridSize = this.renderer.getGridSize(),
            scrollbarX = this.ctx.canvas.width / gridSize.width < 1,
            scrollbarY = this.ctx.canvas.height / gridSize.height < 1;

        var percentLeft = Math.min( Math.max( -this.ctx.canvasMatrix.e / gridSize.width ,0 ), 1 ), // stay within 0-1
            percentTop = Math.min( Math.max( -this.ctx.canvasMatrix.f / gridSize.height ,0 ), 1), // stay within 0-1
            leftMax = this.$element.width() - parseFloat( this.$scope.dimensionScrollbar.width ),
            topMax = this.$element.height() - axisWidth - parseFloat( this.$scope.measureScrollbar.height );

        this.$scope.dimensionScrollbar.left = percentLeft * ( leftMax - axisWidth ) + axisWidth + 'px';
        this.$scope.measureScrollbar.top = percentTop * ( topMax ) + 'px';

        this.$scope.dimensionScrollbar.display = scrollbarX ? '' : 'none';
        this.$scope.measureScrollbar.display = scrollbarY ? '' : 'none';
    }

    function zoom ( focusPoint, delta ) {

        var ctx = this.ctx;
        var pt = ctx.transformedPoint( focusPoint.x, focusPoint.y );

        var factor = Math.pow( scaleFactor, delta );
        var currentScaling = ctx.getTransform().a;

        if ( currentScaling * factor < zoomMinLimit )  {
            factor = zoomMinLimit / currentScaling;
        } else if ( currentScaling * factor > zoomMaxLimit ) {
            factor = zoomMaxLimit / currentScaling;
        }

        ctx.translate( pt.x, pt.y );
        ctx.scale( factor, factor );
        ctx.translate( -pt.x, -pt.y );

        updateScrollBars.call( this );
        this.renderer.render();

    }

    function pan ( swipeDeltaX, swipeDeltaY ) {

        var scaling = this.ctx.getScale(),
            deltaX = swipeDeltaX / scaling,
            deltaY = swipeDeltaY / scaling;

        this.ctx.translate( deltaX, deltaY );

        updateScrollBars.call( this );
        this.renderer.render();

        this.pendingPanning = false;
    }

    function scroll ( e ) {

        if ( !this.$scope.interactive || this.realObject.visible ) {
            return;
        }

        e.preventDefault();

        var delta = e.wheelDelta ? e.wheelDelta / 40 : e.detail ? -e.detail : 0;

        // Scrolling X and Y axis (add possibility to scroll by dragging on scrollbar?)

        var axisWidth = this.$scope.doHelper.axisWidth,
            objOffset = this.$element.offset(),
            cursorPos = {
                x: e.clientX - objOffset.left,
                y: e.clientY - objOffset.top
            };

        if ( cursorPos.x < axisWidth && cursorPos.y < this.ctx.canvas.height ) {
            pan.call( this, 0, delta * 5 );
        } else if ( cursorPos.y > axisWidth && cursorPos.y > this.ctx.canvas.height ) {
            pan.call( this, delta * 5, 0 );
        } else {
            zoom.call( this, { x: e.offsetX, y: e.offsetY }, delta );
        }
    }

    function zoomIn() {

        var delta = 3;
        var focusPoint = {
            x: this.ctx.canvas.width / 2,
            y: this.ctx.canvas.height / 2
        };
        zoom.call( this, focusPoint, delta );
    }

    function zoomOut() {

        var delta = -3;
        var focusPoint = {
            x: this.ctx.canvas.width / 2,
            y: this.ctx.canvas.height / 2
        };
        zoom.call( this, focusPoint , delta );
    }

    function resetZoom () {

        this.renderer.resetZoom();
        this.$scope.dimensionScrollbar.left = this.$scope.doHelper.axisWidth;
        this.$scope.measureScrollbar.top = '0';
    }

    function setChartType ( newType ) {

        var $scope = this.$scope;

        // Remove "active chart" class from buttons
        var activeChartBtn = this.$element.find( '.active-charttype' )[0];

        if ( activeChartBtn ) {
            activeChartBtn.className = activeChartBtn.className.replace( ' active-charttype', '' );
        }

        // Change current chartType and re-draw chart
        $scope.chartType = newType || $scope.chartType;

        if ( this.isSnapshot ) {
            $scope.chartType = this.snapshotData.renderingInfo.chartType;
        }

        this.renderer.setChartType( $scope.chartType );
        if ( this.realObject.visible ) {
            this.realObject.updateChartType( $scope.chartType );
        } else {
            this.renderer.render();
        }

        // Add "active chart" class to correct button
        this.$element.find( '.chart-type-' + $scope.chartType ).addClass( 'active-charttype' );
    }

    function setAggrFunc ( newFunc ) {

        var $scope = this.$scope;

        $scope.aggrFunc = newFunc;

        if ( this.isSnapshot ) {
            $scope.aggrFunc = this.snapshotData.renderingInfo.aggrFunc || 'Sum'; // For snapshots missing this info
        }

        this.dataHandler.setAggrFunc( $scope.aggrFunc );

        $scope.newData();
    }

    function openSettings () {
        this.$scope.settingsOpen = !this.$scope.settingsOpen;
    }

    function closeSettings ( $event ) {

        var $target = $( $event.target );

        if ( $target.hasClass( 'settings-button' ) || $target.hasClass( 'grid-canvas' ) ) {
            return;
        }

        this.$scope.settingsOpen = false;
    }

    function bindEvents( $scope, $element ) {

        handlePanAndZoom.call( this );

        $element[0].addEventListener( 'DOMMouseScroll', scroll.bind( this ) );
        $element[0].addEventListener( 'mousewheel', scroll.bind( this ) );
        $scope.resetZoom = resetZoom.bind( this );
        $scope.zoomIn = zoomIn.bind( this );
        $scope.zoomOut = zoomOut.bind( this );
        $scope.openRealObject = openRealObject.bind( this );
        $scope.closeRealObject = closeRealObject.bind( this );
        $scope.openSettings = openSettings.bind( this );
        $scope.closeSettings = closeSettings.bind( this );
        $scope.setChartType = setChartType.bind( this );
        $scope.setAggrFunc = setAggrFunc.bind( this );
    }

    function openRealObject ( event ) {

        if ( this.$scope.settingsOpen || !this.$scope.interactive ) {
            this.$scope.settingsOpen = false;
            return;
        }

        var point = {
            x: event.originalEvent.layerX,
            y: event.originalEvent.layerY
        };

        var chartInfo = this.renderer.getInfoFromPoint( point );

        if ( chartInfo ) {

            point.x += this.ctx.canvas.offsetLeft;
            point.y += this.ctx.canvas.offsetTop;

            this.realObject.create( this.$scope.chartType, this.$scope.aggrFunc, chartInfo, point );
        }
    }

    function closeRealObject () {
        if ( this.realObject.visible ) {
            this.realObject.close();
        }
    }

    function handlePanAndZoom () {

        var self = this,
            swipeDelta = {
                x: 0,
                y: 0
            },
            objOffset;

        /* --------- Handle panning ---------- */
        Touche( this.$element[0] ).swipe( {
            id: '.data-overviewer',
            options: {
                which: [1, 2]
            },
            start: function ( e, data ) {

                if ( !self.$scope.interactive || self.realObject.visible ) {
                    this.cancel();
                    return;
                }

                objOffset = self.$element.offset();

                Touche.preventGestures( this.gestureHandler );
            },
            update: function ( e, data ) {

                if( !self.pendingPanning ){
                    self.pendingPanning = true;

                    if ( data.swipe.startPoint.x - objOffset.left >= self.$scope.doHelper.axisWidth && data.swipe.startPoint.y - objOffset.top <= self.ctx.canvas.height ) {
                        utils.requestAnimFrame.call( window, pan.bind( self, swipeDelta.x + data.swipe.curDeltaX, swipeDelta.y + data.swipe.curDeltaY ) );
                    } else if ( data.swipe.startPoint.y - objOffset.top > self.ctx.canvas.height ) {
                        utils.requestAnimFrame.call( window, pan.bind( self, swipeDelta.x + data.swipe.curDeltaX, 0 ) );
                    } else {
                        utils.requestAnimFrame.call( window, pan.bind( self, 0, swipeDelta.y + data.swipe.curDeltaY ) );
                    }

                    swipeDelta.x = swipeDelta.y = 0;
                } else {
                    swipeDelta.x += data.swipe.curDeltaX;
                    swipeDelta.y += data.swipe.curDeltaY;
                }
            },
            end: function () {
                self.pendingPanning = false;
            }
        } );

        var lastCenterPoint;

        Touche( this.ctx.canvas ).pinch( {
            id: '.data-overviewer',
            options: {
                pinchThreshold: 0
            },
            start: function ( e, data ) {

                if ( !self.$scope.interactive || self.realObject.visible ) {
                    this.cancel();
                    return;
                }

                objOffset = self.$element.find( '.grid-canvas').offset();

                lastCenterPoint =  {
                    x: data.centerPoint.x,
                    y: data.centerPoint.y
                };

                Touche.preventGestures( this.gestureHandler );
            },
            update: function ( e, data ) {

                var x,
                    y,
                    curDeltaX = data.centerPoint.x - lastCenterPoint.x,
                    curDeltaY = data.centerPoint.y - lastCenterPoint.y;

                if ( !self.pendingPanning ) {
                    self.pendingPanning = true;
                    x = data.centerPoint.x - objOffset.left;
                    y = data.centerPoint.y - objOffset.top;

                    utils.requestAnimFrame.call( window, function () {

                        zoom.call( self, { x: x, y: y }, data.delta / 20 );
                        pan.call( self, swipeDelta.x + curDeltaX, swipeDelta.y + curDeltaY );
                    } );

                    swipeDelta.x = swipeDelta.y = 0;
                } else {
                    swipeDelta.x += curDeltaX;
                    swipeDelta.y += curDeltaY;
                }

                lastCenterPoint = {
                    x: data.centerPoint.x,
                    y: data.centerPoint.y
                };

                Touche.preventGestures( this.gestureHandler );
            },
            end: function () {
                self.pendingpanning = false;
            }

        } );

    }

    var eventHandler = function ( $scope, $element, realObject, renderer, dataHandler, ctx, isSnapshot, snapshotData ) {

        this.$element = $element;
        this.$scope = $scope;
        this.realObject = realObject;
        this.renderer = renderer;
        this.dataHandler = dataHandler;
        this.ctx = ctx;
        this.pendingPanning = false;
        this.isSnapshot = isSnapshot;
        this.snapshotData = snapshotData;

        var gridSize = this.renderer.getGridSize(),
            scrollbarX = this.ctx.canvas.width / gridSize.width < 1,
            scrollbarY = this.ctx.canvas.height / gridSize.height < 1;

        this.$scope.dimensionScrollbar = {
            left: '75px',
            width: '30px', // relative to amount of dimensions, zoom and object size
            display: isSnapshot || !scrollbarX ? 'none' : ''
        };
        this.$scope.measureScrollbar = {
            top: 0,
            height: '30px', // relative to amount of measures, zoom and object size
            display: isSnapshot || !scrollbarY ? 'none' : ''
        };

        if ( isSnapshot && snapshotData.realObjectVisible ) {
            this.realObject.create( snapshotData.renderingInfo.chartType, snapshotData.renderingInfo.aggrFunc, dimension, measure, point );
            return;
        }

        bindEvents.call( this, $scope, $element );

        setChartType.call( this );
    };

    eventHandler.prototype.destroy = function () {
        Touche( this.$element[0] ).off( "*", '.data-overviewer' );
    };

    return eventHandler;
} );
define( 'js/optimizer',[], function () {

    /* Private */
    var zoomDataLimitDivider = 4.5, // Maybe these should be fine tuned
        zoomRenderLimitDivider = 3.5;

    function updateZoomLimits () {
        this.zoomDataLimit = Math.round( ( this.objectSizeParam + this.networkSpeedParam ) / zoomDataLimitDivider * 100 ) / 100; // 2 decimals
        this.zoomRenderLimit = Math.round( ( this.objectSizeParam + this.networkSpeedParam ) / zoomRenderLimitDivider * 100 ) / 100;
    }

    /* Class */
    var optimizer = function () {

        // default values...
        this.zoomDataLimit = 0.9;
        this.zoomRenderLimit = 1.0;
        this.objectSizeParam = 1; // 1 for small, 2 for large, 3 for large
        this.networkSpeedParam = 1; // 1 for fast, 2 for slow
    };

    /* non-static functions - move to another class? */
    optimizer.prototype.updateObjectSizeParam = function ( objectElement ) {

        var objectArea = objectElement.clientWidth * objectElement.clientHeight;

        if ( objectArea <= 200000 ) {
            this.objectSizeParam = 1;
        } else if ( objectArea > 200000 && objectArea < 420000 ) {
            this.objectSizeParam = 2;
        } else {
            this.objectSizeParam = 3;
        }

        updateZoomLimits.call( this );
    };

    optimizer.prototype.updateNetworkSpeedParam = function ( responseTime ) {

        if ( responseTime ) {
            if ( responseTime <= 200 ) {
                this.networkSpeedParam = 1;
            } else {
                this.networkSpeedParam = 2;
            }
        }

        updateZoomLimits.call( this );
    };

    return optimizer;

} );

define( 'js/do-helper',[], function () {

    var axisWidthParam = 75;

    var doHelper = function ( $element ) {

        this.$element = $element;
        this.chartScale = 1;
        this.updateAxisWidth();
    };

    doHelper.prototype.setChartScale = function ( scale ) {
        this.chartScale = scale;
    };

    doHelper.prototype.updateAxisWidth = function () {
        this.axisWidth = this.chartScale * axisWidthParam;
    };

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    doHelper.prototype.throttle = function ( func, wait, immediate ) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if ( !immediate ) func.apply( context, args );
            };
            var callNow = immediate && !timeout;
            clearTimeout( timeout );
            timeout = setTimeout( later, wait );
            if ( callNow ) func.apply( context, args );
        };
    };

    return doHelper;

} );
define( 'js/field-handler',[], function () {

    function moveField ( dimension, measure ) {

        if ( dimension ) {
            this.dataHandler.dimToMeasure( dimension.dimension );
        } else {
            this.dataHandler.measureToDim( measure.measure );
        }

        this.dataHandler.clearMatrix();

        this.dataHandler.populateDataMatrix();
        this.renderer.render( true );
    }

    var fieldHandler = function ( $scope, renderer, dataHandler ) {

        this.$scope = $scope;
        this.renderer = renderer;
        this.dataHandler = dataHandler;
        this.contextMenuService = qvangularGlobal.getService( 'qvContextMenu' );

        // add context menu handler to $scope
        $scope.openContextMenu = this.openContextMenu.bind( this );

    };

    fieldHandler.prototype.openContextMenu = function ( $event ) {

        if ( !this.$scope.interactive || !this.$scope.autoMode ) {
            return;
        }

        var $target = $( $event.target ),
            dimension = $target.hasClass( 'dimension-title' ) ? $target.scope() : null,
            measure = $target.hasClass( 'measure-title' ) ? $target.scope() : null;

        // Identify which (if any) field was clicked - otherwise do nothing

        if ( !dimension && !measure ) {
            return;
        }

        $event.stopPropagation();

        var service = this.contextMenuService;

        var menu = service.menu( { docking: "BottomLeft" } );

        menu.addItem( {
            translation: dimension ? "Move to Y-axis" : "Move to X-axis",
            select: moveField.bind( this, dimension, measure )
        } );

        service.show( menu, {
            position: {
                x: $event.pageX,
                y: $event.pageY
            }
        } );


    };

    return fieldHandler;

} );
define( 'js/real-object',[
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

    realObject.prototype.create = function ( chartType, aggrFunc, chartInfo, animPoint ) {

        this.chartType = chartType;

        createObjectElement.call( this, animPoint );

        var self = this;

        setTimeout( function () {
            self.visible = self.$scope.realObjectVisible = true;
            createObject.call( self, chartType, aggrFunc, chartInfo );

            // To make selections toolbar visible
            self.$element.find( '.dataoverviewer' ).css( 'overflow', 'visible' );
            self.$element.parents( '.qv-object' ).css( 'overflow', 'visible' );
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
        this.$element.parents( '.qv-object' ).css( 'overflow', '' );

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
        this.$element.parents( '.qv-object' ).css( 'overflow', '' );

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

define('text!html/properties-data.html',[],function () { return '<div class="pp-component do-props">\r\n\t<p class="do-props-label" ng-if="dimensions">Dimensions</p>\r\n\t<ul qva-activate="onClick($event, \'dimension\')">\r\n\t\t<li ng-repeat="dimension in dimensions track by dimension.qMeta.title" class="do-props-list-item" ng-class="{\'selected\': dimension.selected}">\r\n\t\t\t<span class="do-props-item-name">{{dimension.qMeta.title}}</span>\r\n\t\t</li>\r\n\t</ul>\r\n\t<p class="do-props-label" ng-if="measures">Measures</p>\r\n\t<ul qva-activate="onClick($event, \'measure\')">\r\n\t\t<li ng-repeat="measure in measures track by measure.qMeta.title" class="do-props-list-item" ng-class="{\'selected\': measure.selected}">\r\n\t\t\t<span class="do-props-item-name">{{measure.qMeta.title}}</span>\r\n\t\t</li>\r\n\t</ul>\r\n\t<p class="do-props-label">Fields</p>\r\n\t<ul qva-activate="onClick($event, \'field\')">\r\n\t\t<li ng-repeat="field in fields track by field.qName" class="do-props-list-item" ng-class="{\'selected\': field.selected}">\r\n\t\t\t<button class="do-props-aggr-btn" ng-if="definition.axis === \'y\' && field.selected" ng-class="{\'active\': pickerForScopeId === $id }">{{field.aggrFunc || \'Sum\'}}</button><span class="do-props-item-name">{{field.qName}}</span>\r\n\t\t</li>\r\n\t</ul>\r\n\r\n\t<div class="do-props-aggr-picker" ng-show="aggrPickerOpen" qva-outside="closeAggrPicker($event)" ng-style="aggrPickerPosition">\r\n\t\t<p class="do-props-aggr-picker-label">Aggregation function</p>\r\n\t\t<div class="qui-buttongroup aggr-btn-group">\r\n\t\t\t<button class="qui-button" ng-class="{\'qui-active\': pickingAggrForModel.aggrFunc === \'Sum\'}" qva-activate="setAggrFunc(\'Sum\')"><span>Sum</span></button>\r\n\t\t\t<button class="qui-button" ng-class="{\'qui-active\': pickingAggrForModel.aggrFunc === \'Avg\'}" qva-activate="setAggrFunc(\'Avg\')"><span>Avg</span></button>\r\n\t\t\t<button class="qui-button" ng-class="{\'qui-active\': pickingAggrForModel.aggrFunc === \'Count\'}" qva-activate="setAggrFunc(\'Count\')"><span>Count</span></button>\r\n\t\t\t<button class="qui-button" ng-class="{\'qui-active\': pickingAggrForModel.aggrFunc === \'Max\'}" qva-activate="setAggrFunc(\'Max\')"><span>Max</span></button>\r\n\t\t\t<button class="qui-button" ng-class="{\'qui-active\': pickingAggrForModel.aggrFunc === \'Min\'}" qva-activate="setAggrFunc(\'Min\')"><span>Min</span></button>\r\n\t\t</div>\r\n\t</div>\r\n</div>';});

define( 'js/data-properties',[
	"qlik",
	"./utils",
	"text!html/properties-data.html"],
function ( qlik, utils, template ) {

	var defaultAggrFunc = 'Sum';

	function indexOfField( list, fieldModel, fieldType ) {

		for ( var i = 0; i < list.length; i++ ) {

			if ( fieldType === 'field' ) {
				if ( fieldModel.qName === list[i].name ) {
					return i;
				}
			} else {
				if ( list[i].id === fieldModel.qInfo.qId ) {
					return i;
				}
			}
		}

		return -1;

	}

	/**
	 *
	 * @param propsFields - dimensions, measures and fields included in properties for current axis
	 * @param fields - all dimensions, measures or fields
	 * @param type - dimension, measure or field
	 */
	function selectAccordingToProps ( propsFields, fields, type ) {

		for ( var i = 0; i < fields.length; i++ ) {
			var foundIndex = propsFields && indexOfField( propsFields, fields[i], type );
			if ( foundIndex > -1 ) {
				fields[i].selected = true;
				fields[i].aggrFunc = propsFields[foundIndex].aggrFunc;
			}
		}
	}

	function updateProps ( $scope, fieldModel, fieldType ) {

		var axis = $scope.definition.axis;

		if ( !$scope.data.fields[axis] ) {
			$scope.data.fields[axis] = [];
		} else {
			// remove old, invalid fieldModel
			var index = indexOfField( $scope.data.fields[axis], fieldModel, fieldType );
			if ( index !== -1 ) {
				$scope.data.fields[axis].splice( index, 1 );
			}
		}

		if ( fieldModel.selected ) {
			fieldModel.aggrFunc = fieldModel.aggrFunc || defaultAggrFunc;
			if ( fieldType === 'field' ) {
				$scope.data.fields[axis].push( { name: fieldModel.qName, aggrFunc: fieldModel.aggrFunc || defaultAggrFunc } );
			} else {
				$scope.data.fields[axis].push( { id: fieldModel.qInfo.qId, title: fieldModel.qMeta.title } );
			}

		}

		$scope.$emit( 'saveProperties' );
	}

	var component = {
		template: template,
		controller: ["$scope", "$element", function ( $scope, $element ) {

			var unsubscribeSessionId;

			$scope.aggrFunc = defaultAggrFunc;

			$scope.setAggrFunc = function ( aggrFunc ) {

				if ( aggrFunc !== $scope.pickingAggrForModel.aggrFunc ) {
					$scope.pickingAggrForModel.aggrFunc = aggrFunc;
					updateProps( $scope, $scope.pickingAggrForModel, $scope.pickingAggrFieldType );
				}
			};

			$scope.closeAggrPicker = function ( $event ) {

				var $target = $( $event.target );

				if ( $target.hasClass( 'do-props-aggr-btn' ) || $target.parents( '.do-props' ).length ) {
					return;
				}

				$scope.aggrPickerOpen = false;
				$scope.pickingAggrForModel = null;
				$scope.pickingAggrFieldType = null;
				$scope.pickerForScopeId = null;
			};

			utils.subscribeFieldUpdates( function ( data ) {

				if ( $scope.definition.axis === 'x' ) {
					$scope.dimensions = data.qDimensionList.qItems;
					selectAccordingToProps( $scope.data.fields.x, $scope.dimensions, 'dimension' );
				} else {
					$scope.measures = data.qMeasureList.qItems;
					selectAccordingToProps( $scope.data.fields.y, $scope.measures, 'measure' );
				}

				$scope.fields = data.qFieldList.qItems;
				selectAccordingToProps( $scope.data.fields[$scope.definition.axis], $scope.fields, 'field' );

				unsubscribeSessionId = data.qInfo.qId;
			} );

			$scope.onClick = function ( e, fieldType ) {

				var $target = $( e.target );

				if ( $scope.aggrPickerOpen ) {
					$scope.aggrPickerOpen = false;
					$scope.pickerForScopeId = null;
					return;
				}

				if ( $target.hasClass( 'do-props-aggr-btn' ) ) {

					var top = $target[0].offsetTop + 32;
					var aggPickerHeight = 73;
					var propsBottomPadding = 30;
					var listBottom = $element[0].clientHeight;
					if ( top + aggPickerHeight > listBottom + propsBottomPadding ) {
						top = $target[0].offsetTop - 2 - aggPickerHeight;
					}

					$scope.aggrPickerPosition = {
						left: 3 + 'px',
						top: top + 'px'
					};
					$scope.aggrPickerOpen = !$scope.aggrPickerOpen;
					$scope.pickingAggrForModel = $target.scope()[fieldType];
					$scope.pickingAggrFieldType = fieldType;
					$scope.pickerForScopeId = $target.scope().$id;
				} else if ( $target.scope()[fieldType] ) {

					var fieldModel = $target.scope()[fieldType];
					fieldModel.selected = !fieldModel.selected;
					updateProps( $scope, fieldModel, fieldType );
				}

			};

			$scope.$on( '$destroy', function () {
				qlik.currApp().destroySessionObject( unsubscribeSessionId );
			} );
		}]
	};

	return component;
} );

define('text!html/properties-aggr.html',[],function () { return '<div class="pp-component do-aggr-props">\r\n\t<p class="do-props-label">Aggregation function</p>\r\n\t<div class="qui-buttongroup aggr-btn-group">\r\n\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Sum\'}" qva-activate="setAggrFunc(\'Sum\')"><span>Sum</span></button>\r\n\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Avg\'}" qva-activate="setAggrFunc(\'Avg\')"><span>Avg</span></button>\r\n\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Count\'}" qva-activate="setAggrFunc(\'Count\')"><span>Count</span></button>\r\n\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Max\'}" qva-activate="setAggrFunc(\'Max\')"><span>Max</span></button>\r\n\t\t<button class="qui-button" ng-class="{\'qui-active\': aggrFunc === \'Min\'}" qva-activate="setAggrFunc(\'Min\')"><span>Min</span></button>\r\n\t</div>\r\n</div>';});

define( 'js/aggr-props',[
	"text!html/properties-aggr.html"],
function ( template ) {

	var defaultAggrFunc = 'Sum';

	var component = {
		template: template,
		controller: ["$scope", function ( $scope ) {

			$scope.aggrFunc = $scope.data.fields.aggrFunc || defaultAggrFunc;

			$scope.setAggrFunc = function ( aggrFunc ) {

				if ( aggrFunc !== $scope.setAggrFunc ) {
					$scope.data.fields.aggrFunc = $scope.aggrFunc = aggrFunc;

					$scope.$emit( 'saveProperties' );
				}
			};
		}]
	};

	return component;
} );

define('text!html/properties-chart-type.html',[],function () { return '<div class="pp-component do-chart-type-props">\r\n\t<p class="do-props-label">Chart type</p>\r\n\t<button class="chart-type-bar chart-btn qui-plainbuttonicon" ng-class="{\'active-charttype\': chartType === \'bar\'}" qva-activate="setChartType( \'bar\' )" data-icon="!" title="Bar chart"></button>\r\n\t<button class="chart-type-line chart-btn qui-plainbuttonicon" ng-class="{\'active-charttype\': chartType === \'line\'}" qva-activate="setChartType( \'line\' )" data-icon="%" title="Line chart"></button>\r\n</div>';});

define( 'js/chart-props',[
	"text!html/properties-chart-type.html"],
function ( template ) {

	var defaultChartType = 'line';

	var component = {
		template: template,
		controller: ["$scope", function ( $scope ) {

			$scope.chartType = $scope.data.chartType || defaultChartType;

			$scope.setChartType = function ( chartType ) {

				if ( chartType !== $scope.chartType ) {
					$scope.data.chartType = $scope.chartType = chartType;

					$scope.$emit( 'saveProperties' );
				}
			};
		}]
	};

	return component;
} );

define('text!css/styling.css',[],function () { return '.qv-object-dataoverviewer {\r\n    font-size: inherit;\r\n}\r\n\r\n.dataoverviewer {\r\n    width: 100%;\r\n    height: 100%;\r\n    position: relative;\r\n    overflow: hidden;\r\n}\r\n\r\n.qv-snapshot-enabled .dataoverviewer {\r\n    padding-right: 2px;\r\n    padding-bottom: 2px;\r\n}\r\n\r\n.dataoverviewer .grid-canvas {\r\n    position: absolute;\r\n    top: 0;\r\n    right: 0;\r\n    border-left: 1px solid gray;\r\n    border-bottom: 1px solid gray;\r\n    z-index: 2;\r\n}\r\n\r\n.dataoverviewer .settings-button,\r\n.dataoverviewer .reset-zoom,\r\n.dataoverviewer .zoom-in,\r\n.dataoverviewer .zoom-out,\r\n.dataoverviewer .close-real-object {\r\n    position: absolute;\r\n    top: 10px;\r\n    right: 10px;\r\n    display: inline-block;\r\n    line-height: 24px;\r\n    z-index: 5;\r\n}\r\n\r\n.dataoverviewer .zoom-in {\r\n    top: 45px;\r\n}\r\n\r\n.dataoverviewer .zoom-out {\r\n    top: 70px;\r\n}\r\n\r\n.do-needs-x-and-y-fields {\r\n    display: none;\r\n}\r\n\r\n.insufficient-fields .do-needs-x-and-y-fields {\r\n    display: block;\r\n    text-align: center;\r\n    position: absolute;\r\n    z-index: 6;\r\n    width: 100%;\r\n    height: 100%;\r\n    top: 47%;\r\n    font-size: 15px;\r\n    font-weight: bold;\r\n}\r\n\r\n.insufficient-fields .dimension-titles-container,\r\n.insufficient-fields .dimension-scrollbar,\r\n.insufficient-fields .measure-titles-container,\r\n.insufficient-fields .measure-scrollbar,\r\n.insufficient-fields .qui-plainbuttonicon,\r\n.insufficient-fields .grid-canvas {\r\n    display: none;\r\n}\r\n\r\n/* ------------------ "Real objects" ------------------ */\r\n\r\n.dataoverviewer .real-object {\r\n    position: absolute;\r\n    z-index: 4;\r\n    height: 0%;\r\n    width: 0%;\r\n    -webkit-transition: 0.4s ease-in-out;\r\n    -moz-transition: 0.4s ease-in-out;\r\n    -o-transition: 0.4s ease-in-out;\r\n    transition: 0.4s ease-in-out;\r\n    background-color: white;\r\n    border: 1px solid lightgray;\r\n    -webkit-box-sizing: border-box;\r\n    -moz-box-sizing: border-box;\r\n    box-sizing: border-box;\r\n}\r\n\r\n.dataoverviewer .real-object.maximized {\r\n    top: 0;\r\n    left: 0;\r\n    width: 100%;\r\n    height: 100%;\r\n}\r\n\r\n\r\n/* ---------- Dimension and measure titles ----------- */\r\n\r\n.dataoverviewer .measure-titles-container {\r\n    position: absolute;\r\n    z-index: 4;\r\n    top: 0;\r\n    left: 0;\r\n    bottom: 0;\r\n}\r\n\r\n.dataoverviewer .dimension-titles-container {\r\n    position: absolute;\r\n    z-index: 4;\r\n    bottom: 0;\r\n    left: 0;\r\n    white-space: nowrap;\r\n    overflow: visible;\r\n    left: 9.8em;\r\n    width: 5.8em;\r\n    margin-right: 8.5em;\r\n}\r\n\r\n.dataoverviewer .dimension-title,\r\n.dataoverviewer .measure-title {\r\n    border-radius: 0.5em;\r\n    line-height: 1.6em;\r\n    border: 1px solid gray;\r\n    width: 93%;\r\n    font-size: 0.9em;\r\n    margin-bottom: inherit;\r\n    margin-right: inherit;\r\n    position: relative;\r\n    text-align: center;\r\n    display: block;\r\n    -webkit-box-sizing: border-box;\r\n    -moz-box-sizing: border-box;\r\n    box-sizing: border-box;\r\n    white-space: nowrap;\r\n    overflow: hidden;\r\n    text-overflow: ellipsis;\r\n    cursor: default;\r\n}\r\n\r\n.dataoverviewer:not(.auto-mode) .dimension-title,\r\n.dataoverviewer:not(.auto-mode) .measure-title {\r\n    border: none;\r\n    text-align: right;\r\n}\r\n\r\n.dataoverviewer .dimension-title {\r\n    display: inline-block;\r\n    transform: rotate(-45deg);\r\n    bottom: 2em;\r\n}\r\n\r\n.dataoverviewer .dimension-scrollbar {\r\n    position: absolute;\r\n    bottom: 68px;\r\n    background-color: lightgray;\r\n    border-radius: 3px;\r\n    height: 6px;\r\n    z-index: 3;\r\n    min-top: 0px;\r\n}\r\n\r\n.dataoverviewer .measure-scrollbar {\r\n    position: absolute;\r\n    left: 67px;\r\n    background-color: lightgray;\r\n    border-radius: 3px;\r\n    width: 6px;\r\n    z-index: 3;\r\n    min-top: 0px;\r\n}\r\n\r\n/* -------------------- On the fly settings ------------------- */\r\n\r\n.dataoverviewer .settings-button {\r\n    right: 40px;\r\n}\r\n\r\n.dataoverviewer .settings-container {\r\n    position: absolute;\r\n    top: 45px;\r\n    right: 10px;\r\n    width: 0;\r\n    height: auto;\r\n    background-color: white;\r\n    z-index: 5;\r\n    border-radius: 5px;\r\n    border: 1px solid gray;\r\n    text-align: center;\r\n    padding: 5px;\r\n    box-shadow: 0 4px 8px -1px #404040;\r\n    -webkit-animation: animNarrow 0.4s forwards;\r\n    -o-animation: animNarrow 0.4s forwards;\r\n    animation: animNarrow 0.4s forwards;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n}\r\n\r\n.dataoverviewer.auto-mode .settings-container {\r\n    -webkit-animation: animWide 0.4s forwards;\r\n    -o-animation: animWide 0.4s forwards;\r\n    animation: animWide 0.4s forwards;\r\n    height: 108px;\r\n    padding: 5px 0px;\r\n}\r\n\r\n.dataoverviewer.interactive .grid-canvas,\r\n.dataoverviewer.interactive.auto-mode .dimension-title,\r\n.dataoverviewer.interactive.auto-mode .measure-title {\r\n    cursor: pointer;\r\n}\r\n\r\n.do-chart-type-props .chart-btn,\r\n.dataoverviewer .settings-container .chart-btn {\r\n    font-size: 45px;\r\n    height: 1em;\r\n    line-height: 0.8em;\r\n    width: 1em;\r\n    display: inline-block;\r\n    text-align: center;\r\n    vertical-align: middle;\r\n    border: 2px solid white;\r\n    border-radius: 6px;\r\n    -webkit-box-sizing: content-box;\r\n    -moz-box-sizing: content-box;\r\n    box-sizing: content-box;\r\n    margin-bottom: 3px;\r\n    -webkit-box-shadow: none;\r\n    -moz-box-shadow: none;\r\n    box-shadow: none;\r\n    color: #595959 !important;\r\n    background: transparent !important;\r\n}\r\n\r\n.pp-component.do-chart-type-props .chart-btn {\r\n    font-size: 75px;\r\n    margin: 5px;\r\n}\r\n\r\n.do-chart-type-props .chart-btn:hover,\r\n.dataoverviewer .settings-container .chart-btn:hover {\r\n    border: 2px solid #595959;\r\n    color: #595959;\r\n}\r\n\r\n.do-chart-type-props .active-charttype,\r\n.dataoverviewer .settings-container .active-charttype {\r\n    color: #595959;\r\n    border: 2px solid #ff9326;\r\n}\r\n\r\n.do-chart-type-props .active-charttype:hover,\r\n.dataoverviewer .settings-container .active-charttype:hover {\r\n    border: 2px solid #ff9326;\r\n}\r\n\r\n.aggr-btn-group .qui-button {\r\n    padding: 1px 1px;\r\n    min-width: 39px;\r\n}\r\n\r\n.aggr-btn-group .qui-button span {\r\n    padding: 0 5px;\r\n}\r\n\r\n.settings-container .aggr-btn-group,\r\n.do-props-aggr-picker .aggr-btn-group {\r\n    position: absolute;\r\n    left: 5px;\r\n}\r\n\r\n/* --------------- Properties panel -------------- */\r\n\r\n.do-props {\r\n    padding: 0;\r\n    position: relative;\r\n}\r\n\r\n.do-props .do-props-list-item {\r\n    white-space: nowrap;\r\n    overflow: hidden;\r\n    height: 30px;\r\n    line-height: 30px;\r\n    cursor: pointer;\r\n    border-bottom: 1px solid #d9d9d9;\r\n    padding: 5px;\r\n}\r\n\r\n.do-props .do-props-list-item:hover {\r\n    background-color: #F2F2F2;\r\n}\r\n\r\n.do-props .do-props-list-item.selected {\r\n    background-color: #52CC52;\r\n    color: #FFFFFF;\r\n    border-bottom: 1px solid #BAEBBA;\r\n}\r\n\r\n.do-props .do-props-label {\r\n    font-weight: bold;\r\n    border-bottom: 3px solid #595959;\r\n    padding: 5px;\r\n}\r\n\r\n.do-props .do-props-aggr-btn {\r\n    background-color: white;\r\n    border: 1px solid darkgray;\r\n    padding: 5px;\r\n    margin-right: 4px;\r\n    cursor: pointer;\r\n    border-radius: 3px;\r\n    line-height: 17px;\r\n}\r\n\r\n.do-props .do-props-aggr-btn:hover {\r\n    border: 1px solid black;\r\n}\r\n\r\n.do-props .do-props-aggr-btn.active {\r\n    color: #ffffff;\r\n    border-color: #595959;\r\n    background: #595959;\r\n}\r\n\r\n.do-props-aggr-picker {\r\n    position: absolute;\r\n    width: 0;\r\n    height: 61px;\r\n    background-color: white;\r\n    z-index: 5;\r\n    border-radius: 5px;\r\n    border: 1px solid gray;\r\n    text-align: center;\r\n    padding-top: 5px;\r\n    box-shadow: 0 4px 8px -1px #404040;\r\n    -webkit-animation: animWide 0.6s forwards;\r\n    -o-animation: animWide 0.6s forwards;\r\n    animation: animWide 0.6s forwards;\r\n    overflow: hidden;\r\n    white-space: nowrap;\r\n}\r\n\r\n.do-props-aggr-picker-label {\r\n    text-align: left;\r\n    margin: 5px;\r\n}\r\n\r\n.do-aggr-props .aggr-btn-group {\r\n    margin: 5px 0px;\r\n}\r\n\r\n.do-chart-type-props {\r\n    text-align: center;\r\n}\r\n\r\n.do-chart-type-props .do-props-label {\r\n    text-align: left;\r\n}\r\n\r\n/* animation for revealing popup in a nice way */\r\n@-webkit-keyframes animNarrow {\r\n    100% {  width: 103px; }\r\n}\r\n\r\n@-o-keyframes animNarrow {\r\n    100% {  width: 103px; }\r\n}\r\n\r\n@keyframes animNarrow {\r\n    100% {  width: 103px; }\r\n}\r\n\r\n@-webkit-keyframes animWide {\r\n    100% {  width: 214px; }\r\n}\r\n\r\n@-o-keyframes animWide {\r\n    100% {  width: 214px; }\r\n}\r\n\r\n@keyframes animWide {\r\n    100% {  width: 214px; }\r\n}';});

define([
    "qlik",
    "text!html/template.html",
    "js/data-handler",
    "js/utils",
    "js/renderer",
    "js/event-handler",
    "js/optimizer",
    "js/do-helper",
    "js/field-handler",
    "js/real-object",
    "js/data-properties",
    "js/aggr-props",
	"js/chart-props",
    "text!css/styling.css"],
function ( qlik, template, DataHandler, utils, Renderer, EventHandler, Optimizer, DOHelper, FieldHandler, RealObject, DataProps, AggrProps, ChartProps, cssContent ) {

    'use strict';

    /* Inject css styling for this object into DOM */
    var head = document.getElementsByTagName('head')[0],
        styleElem = document.createElement( 'style');

    styleElem.innerHTML = cssContent;
    head.appendChild( styleElem );

    function setRealObjectSnapshotData ( object, layout ) {

        object.setSnapshotData( layout );
    }

    function setGridSnapshotData ( layout ) {

        var svgCanvasMatrix = this.$scope.renderer.getCanvasMatrix(),
            canvasMatrix = {
                a: svgCanvasMatrix.a,
                b: svgCanvasMatrix.b,
                c: svgCanvasMatrix.c,
                d: svgCanvasMatrix.d,
                e: svgCanvasMatrix.e,
                f: svgCanvasMatrix.f
            };

        layout.snapshotData.content = layout.snapshotData.object;

        layout.snapshotData.renderingInfo = {
            canvasMatrix: canvasMatrix,
            realObjectVisible: !!this.$scope.realObjectVisible,
            chartType: this.$scope.chartType,
            aggrFunc: this.$scope.aggrFunc,
            dataMatrix: this.$scope.realObjectVisible ? undefined : this.$scope.dataHandler.matrix, //do not save data matrix if snapshotting "real object"
            chartsAsIcons: Math.round( svgCanvasMatrix.a * 100 ) / 100 < this.$scope.optimizer.zoomRenderLimit
        };
    }

    function onStateChanged () {

        this.$scope.interactive = utils.allowInteraction( this.$scope.backendApi.isSnapshot );

        if ( this.$scope.backendApi.isSnapshot ) {
            return;
        }

        this.resetZoomPanBeforeRender = true;
        if ( utils.isInEditState() && this.$scope.closeRealObject ) {
            this.$scope.closeRealObject();
        }
    }

    return {
        template : template,
        controller:['$scope', '$element', function( $scope, $element ){

            $scope.gridCanvas = $element.find( '.grid-canvas' )[0];

            $scope.optimizer = new Optimizer();

            var gridCtx = $scope.gridCanvas.getContext( '2d' );

			var layout = $scope.object.layout;

            $scope.chartType = layout.chartType ? layout.chartType : 'line';   // Default to line chart
            $scope.aggrFunc = layout.fields && layout.fields.aggrFunc ? layout.fields.aggrFunc : 'Sum';    // Default to sum
            $scope.autoMode = layout.fields ? !!layout.fields.auto : true;

            $scope.doHelper = new DOHelper( $element );

            $scope.dataHandler = new DataHandler( $scope.optimizer, $scope.doHelper, $scope.object.model, $scope.backendApi.isSnapshot, layout.snapshotData, $scope.aggrFunc );

            $scope.realObject = new RealObject( $scope, $element );

            $scope.dimensionTitles = [];
            $scope.measureTitles = [];

            // Try to implement without data bindings to improve performance.
            // Not possible when using ng-repeat with titles arrays - need to use canvas instead?
            $scope.measureTitlesPositioning = {
                top: 0,
                width: 0,
                'margin-bottom': 0
            };

            $scope.dimensionTitlesPositioning = {
                left: 0,
                width: 0,
                'margin-right': 0
            };

            $scope.renderer = new Renderer( $element, gridCtx, $scope.dataHandler, $scope.optimizer, $scope.chartType, $scope.dimensionTitles, $scope.measureTitles, $scope.dimensionTitlesPositioning, $scope.measureTitlesPositioning, $scope.doHelper, !!$scope.backendApi.isSnapshot, layout.snapshotData );

            $scope.newData = function () {

                // await new matrix after fields have been moved (don't trigger rendering if matrix is empty)
                if ( !$scope.object.model.isClosed && !$scope.dataHandler.fetchInProgress && $scope.dataHandler.matrix.length && !$scope.object.model.isValidating ) {

                    $scope.dataHandler.clearMatrixData();

                    $scope.renderer.render( true );
                }
            };

            $scope.propertiesChanged = function () {

                $scope.dataHandler.clearMatrix();
                $scope.dataHandler.populateDataMatrix();

                setTimeout( function () { // Timeout needed to await scope variable insufficientFields to get effect in template
                    $scope.renderer.render( true );
                    $scope.autoMode = layout.fields.auto;
                    if ( layout.fields.aggrFunc && layout.fields.aggrFunc !== $scope.aggrFunc ) {
                        $scope.setAggrFunc( layout.fields.aggrFunc );
                    }
                    if ( layout.chartType && layout.chartType !== $scope.chartType ) {
                        $scope.setChartType( layout.chartType );
                    }
                } );
            };

            $scope.dataHandler.fetchAllFields( function () {

                setTimeout( function () { // Timeout needed to await elements to get their correct size

                    $scope.doHelper.updateAxisWidth();
                    $scope.gridCanvas.setAttribute( 'height', $scope.gridCanvas.parentElement.clientHeight - $scope.doHelper.axisWidth );
                    $scope.gridCanvas.setAttribute( 'width', $scope.gridCanvas.parentElement.clientWidth - $scope.doHelper.axisWidth );
                    $scope.optimizer.updateObjectSizeParam( $scope.gridCanvas.parentElement );

                    $scope.renderer.setOptimizedZoom();

                    $scope.eventHandler = new EventHandler( $scope, $element, $scope.realObject, $scope.renderer, $scope.dataHandler, gridCtx, $scope.backendApi.isSnapshot, layout.snapshotData );

                    if ( !$scope.backendApi.isSnapshot ) {
                        var app = qlik.currApp();
                        app.model.Validated.bind( $scope.newData );
                        $scope.object.model.Validated.bind( $scope.propertiesChanged );
                    }
                }, 0 );
            } );

            $scope.fieldHandler = new FieldHandler( $scope, $scope.renderer, $scope.dataHandler );

            $scope.interactive = utils.allowInteraction( $scope.backendApi.isSnapshot );

            $scope.ext.setSnapshotData = function ( layout ) {

                if ( $scope.realObjectVisible ) {
                    setRealObjectSnapshotData( $scope.realObject.object, layout );
                } else {
                    setGridSnapshotData.call( this, layout );
                }
            };
        }],
        paint: function() {
            this.onStateChanged = onStateChanged.bind( this );
        },
        setInteractionState: function () {
            onStateChanged.call( this );
        },
        resize: function ( $element ) {

            var $scope = this.$scope,
                self = this;

            if ( !$scope.renderer.isRendered() ) {
                return;
            }

            setTimeout( function () { // Timeout needed to await elements to get their correct size

                $scope.doHelper.updateAxisWidth();
                $scope.gridCanvas.setAttribute( 'height', $scope.gridCanvas.parentElement.clientHeight - $scope.doHelper.axisWidth );
                $scope.gridCanvas.setAttribute( 'width', $scope.gridCanvas.parentElement.clientWidth - $scope.doHelper.axisWidth );

                $scope.optimizer.updateObjectSizeParam( $scope.gridCanvas.parentElement );

                $scope.renderer.setOptimizedZoom( true );

                $scope.renderer.resize();

                if ( self.resetZoomPanBeforeRender ) {
                    $scope.resetZoom();
                    self.resetZoomPanBeforeRender = false;
                }
            }, 0 );
        },
        snapshot: {
            canTakeSnapshot : true
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                data: {
                    type: 'items',
                    label: "Data",
                    items: {
                        autoSetting: {
                            type: "boolean",
                            label: "Include all data fields",
                            ref: "fields.auto",
                            defaultValue: true
                        },
                        aggFunction: {
                            show: function ( layout ) {
                                return !!layout.fields && layout.fields.auto;
                            },
                            component: AggrProps,
                            label: "Aggregation function"
                        },
                        lists: {
                            component: "expandable-items",
                            items: {
                                xAxis: {
                                    show: function ( layout ) {
                                        return !!layout.fields && !layout.fields.auto;
                                    },
                                    component: DataProps,
                                    label: "X-axis",
                                    axis: 'x'
                                },
                                yAxis: {
                                    show: function ( layout ) {
                                        return !!layout.fields && !layout.fields.auto;
                                    },
                                    component: DataProps,
                                    label: "Y-axis",
                                    axis: 'y'
                                }
                            }
                        }
                    }
                },
                appearance: {
                    uses: "settings",
					items: {
						presentation: {
							label: "Presentation",
							component: ChartProps
						}
					}
                }
            }
        },
        destroy: function () {
            var app = qlik.currApp();
            app.model.Validated.unbind( this.$scope.newData );
            this.$scope.object.model.Validated.unbind( this.$scope.propertiesChanged );
            this.$scope.dataHandler.destroy();
            this.$scope.realObject.destroy();
            this.$scope.eventHandler.destroy();
        }
    };

} );
