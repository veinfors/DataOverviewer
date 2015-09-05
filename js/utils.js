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

            // Do not allow interaction in snapshot state or when rendered as snapshot
            return !utils.isInSnapshotState() && !isSnapshot;
        },

        sortFields: function ( a, b ) {
            if ( a.qName > b.qName ) {
                return 1;
            }
            if ( a.qName < b.qName ) {
                return -1;
            }
            // a must be equal to b
            return 0;
        },

        getGranularity: function ( scaling ) {

            if ( scaling < 1.6 ) {
                return 15;
            } else if ( scaling > 1.6 && scaling < 3 ) {
                return 50;
            } else {
                return 100;
            }
        }

    };

    return utils;

} );
