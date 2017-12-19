define( [],
function () {

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
        subscribeFieldUpdates: function ( app, callback ) {

            var initialFetch = true, // Used for perf optimization
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
                    "qType": "measure",
                    "qData": {
                        "title": "/title",
                        "tags": "/tags",
                        "measure": "/qMeasure"
                    }
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
        },

        colorPalette: [
            [ "#4477aa" ],
            [ "#4477aa", "#cc6677" ],
            [ "#4477aa", "#ddcc77", "#cc6677" ],
            [ "#4477aa", "#117733", "#ddcc77", "#cc6677" ],
            [ "#332288", "#88ccee", "#117733", "#ddcc77", "#cc6677" ],
            [ "#332288", "#88ccee", "#117733", "#ddcc77", "#cc6677", "#aa4499" ],
            [ "#332288", "#44aa99", "#88ccee", "#117733", "#ddcc77", "#cc6677", "#aa4499" ],
            [ "#332288", "#44aa99", "#88ccee", "#117733", "#999933", "#ddcc77", "#cc6677", "#aa4499" ],
            [ "#332288", "#44aa99", "#88ccee", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499" ],
            [ "#332288", "#44aa99", "#88ccee", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#882255", "#aa4499" ],
            [ "#332288", "#6699cc", "#44aa99", "#88ccee", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#882255", "#aa4499" ],
            [ "#332288", "#6699cc", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#661100", "#cc6677", "#aa4466", "#882255", "#aa4499" ]
        ],

        PIE_CHART_OTHERS_LIMIT: 10,

        getPaletteForPieChart: function ( dataPoints, total, hasOthers, hasNullsWithinLimit ) {


            /*  if ( hasOthers && hasNullsWithinLimit ) {
                    palette = utils.colorPalette[Math.min( utils.PIE_CHART_OTHERS_LIMIT - 3, dataPoints.length - 3 )];
                } else if ( hasOthers || hasNullsWithinLimit ) {
                    palette = utils.colorPalette[Math.min( utils.PIE_CHART_OTHERS_LIMIT - 1, dataPoints.length - 2 )];
                } else {
                    palette = utils.colorPalette[Math.min( utils.PIE_CHART_OTHERS_LIMIT - 1, dataPoints.length - 1 )];
                }
            */

            var paletteIndex = Math.min( utils.PIE_CHART_OTHERS_LIMIT - 1 - ( hasOthers ? 1 : 0 ) - ( hasNullsWithinLimit ? 1 : 0 ), dataPoints.length - 1 - ( hasNullsWithinLimit ? 1 : 0 ) );
            return this.colorPalette[paletteIndex] || [];
        }

    };

    return utils;

} );
