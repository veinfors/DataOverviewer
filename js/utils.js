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
            return utils.sort( a.qName, b.qName );
        },

        sortDimOrMeasures: function ( a, b ) {
            return utils.sort( a.qMeta.title, b.qMeta.title );
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
         * Also sorts the data fields alphabetically
         * @param callback
         */
        subscribeFieldUpdates: function ( callback ) {

            var app = qlik.currApp( this ),
                initialFetch = true; // Used for perf optimization

            app.createGenericObject( {
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

                data.qFieldList.qItems.sort( utils.sortFields );
                data.qDimensionList.qItems.sort( utils.sortDimOrMeasures );
                data.qMeasureList.qItems.sort( utils.sortDimOrMeasures );

                callback( data, initialFetch );
                initialFetch = false;
            } );
        }

    };

    return utils;

} );
