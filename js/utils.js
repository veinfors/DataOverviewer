define( ["qlik"],
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
