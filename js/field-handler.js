define( [
    "jquery"
], function ( $ ) {


    function moveField ( dimension, measure ) {

        var self = this;

        if ( dimension ) {
            this.dataHandler.dimToMeasure( dimension.dimension );
        } else {
            this.dataHandler.measureToDim( measure.measure );
        }

        this.dataHandler.clearMatrix();

        this.dataHandler.fetchAllFields( function () {
            self.renderer.render( true );
        } );
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

        if ( !this.$scope.interactive ) {
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