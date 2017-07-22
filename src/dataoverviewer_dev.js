define( [
    "qlik",
    "text!./html/template.html",
    "./js/data-handler",
    "./js/utils",
    "./js/renderer",
    "./js/event-handler",
    "./js/optimizer",
    "./js/do-helper",
    "./js/field-handler",
    "./js/real-object",
    "./js/data-properties",
    "./js/aggr-props",
	"./js/chart-props",
    "text!./css/styling.css"],
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

            $scope.$on( "$destroy", function () {
                var app = qlik.currApp();
                app.model.Validated.unbind( $scope.newData );
                $scope.object.model.Validated.unbind( $scope.propertiesChanged );
                $scope.dataHandler.destroy();
                $scope.realObject.destroy();
                $scope.eventHandler.destroy();
            } );

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
        }
    };

} );