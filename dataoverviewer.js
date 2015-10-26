define( [
    "text!./template.html",
    "./js/data-handler",
    "./js/utils",
    "./js/renderer",
    "./js/event-handler",
    "./js/optimizer",
    "./js/do-helper",
    "./js/field-handler",
    "./js/real-object",
    "./js/data-properties",
    "qlik",
    "text!./css/styling.css"],
function ( template, DataHandler, utils, Renderer, EventHandler, Optimizer, DOHelper, FieldHandler, RealObject, DataProps, qlik, cssContent ) {

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

    return {
        template : template,
        controller:['$scope', '$element', function( $scope, $element ){

            $scope.gridCanvas = $element.find( '.grid-canvas' )[0];

            $scope.optimizer = new Optimizer();

            var gridCtx = $scope.gridCanvas.getContext( '2d' );

            $scope.chartType = 'line';  // Default to line chart
            $scope.aggrFunc = 'Sum';    // Default to sum

            $scope.doHelper = new DOHelper( $element );

            $scope.dataHandler = new DataHandler( $scope.optimizer, $scope.doHelper, $scope.object.model, $scope.backendApi.isSnapshot, $scope.object.model.layout.snapshotData, $scope.aggrFunc );

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

            $scope.renderer = new Renderer( $element, gridCtx, $scope.dataHandler, $scope.optimizer, $scope.chartType, $scope.dimensionTitles, $scope.measureTitles, $scope.dimensionTitlesPositioning, $scope.measureTitlesPositioning, $scope.doHelper, !!$scope.backendApi.isSnapshot, $scope.object.model.layout.snapshotData );

            $scope.newData = function () {

                // await new matrix after fields have been moved (don't trigger rendering if matrix is empty)
                if ( !$scope.dataHandler.fetchInProgress && $scope.dataHandler.matrix.length ) {

                    $scope.dataHandler.clearMatrixData();

                    $scope.renderer.render( true );
                }
            };

            $scope.propertiesChanged = function () {

                $scope.dataHandler.clearMatrix();
                $scope.dataHandler.populateDataMatrix();
                $scope.renderer.render( true );
            };

            $scope.dataHandler.fetchAllFields( function () {

                setTimeout( function () { // Timeout needed to await elements to get their correct size

                    $scope.doHelper.updateAxisWidth();
                    $scope.gridCanvas.setAttribute( 'height', $scope.gridCanvas.parentElement.clientHeight - $scope.doHelper.axisWidth );
                    $scope.gridCanvas.setAttribute( 'width', $scope.gridCanvas.parentElement.clientWidth - $scope.doHelper.axisWidth );
                    $scope.optimizer.updateObjectSizeParam( $scope.gridCanvas.parentElement );

                    $scope.renderer.setOptimizedZoom();

                    $scope.eventHandler = new EventHandler( $scope, $element, $scope.realObject, $scope.renderer, $scope.dataHandler, gridCtx, $scope.backendApi.isSnapshot, $scope.object.model.layout.snapshotData );

                    if ( !$scope.backendApi.isSnapshot ) {
                        var app = qlik.currApp();
                        app.model.Validated.bind( $scope.newData );
                        $scope.object.model.Validated.bind( $scope.propertiesChanged )
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
        paint: function( $element, layout ) {

            var self = this;

            this.onStateChanged = function () {
                self.$scope.interactive = utils.allowInteraction( self.$scope.backendApi.isSnapshot );
            };
        },
        resize: function ( $element ) {

            var $scope = this.$scope;

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
            }, 0 );
        },
        snapshot: {
            canTakeSnapshot : true
        },
        // TODO: backwards compatibility! try with old objects!
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
                            component: "switch",
                            label: "Included fields",
                            ref: "fields.auto",
                            options: [{
                                value: true,
                                label: "Auto"
                            }, {
                                value: false,
                                label: "Custom"
                            }],
                            defaultValue: true
                        },
                        aggFunction: {
                            show: function ( layout ) {
                                return !layout.fields.auto;
                            },
                            type: "boolean",
                            component: "switch",
                            label: "AGGRfield buttons",
                            ref: "fields.auto222",
                            options: [{
                                value: true,
                                label: "Auto"
                            }, {
                                value: false,
                                label: "Custom"
                            }],
                            defaultValue: true
                        },
                        lists: {
                            component: "expandable-items",
                            items: {
                                xAxis: {
                                    show: function ( layout ) {
                                        return !layout.fields.auto;
                                    },
                                    component: DataProps,
                                    //type: "boolean",
                                    label: "X-axis",
                                    axis: 'x'
                                    //ref: "dims.item2.show"
                                },
                                yAxis: {
                                    show: function ( layout ) {
                                        return !layout.fields.auto;
                                    },
                                    component: DataProps,
                                    //type: "boolean",
                                    label: "Y-axis",
                                    axis: 'y'
                                    //ref: "dims.item2.show"
                                }
                            }
                        }
                    }
                },
                appearance: {
                    uses: "settings"
                }
            }
        },
        destroy: function () {
            var app = qlik.currApp();
            app.model.Validated.unbind( this.$scope.newData );
            this.$scope.object.model.Validated.unbind( this.$scope.propertiesChanged );
            this.$scope.realObject.destroy();
            this.$scope.eventHandler.destroy();
        }
    };

} );