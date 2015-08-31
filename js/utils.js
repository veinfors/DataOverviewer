define( [],
function () {

    'use strict';

    var utils = {

        // requestAnim shim layer by Paul Irish
        requestAnimFrame: window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function( callback ){
                window.setTimeout( callback, 1000 / 60 );
            },

        // TODO: shorten text using css ellipsis instead
        /*shortenText: function ( ctx, text, maxWidth ) {
            var width = ctx.measureText( text ).width;
            var ellipsis = '…';
            var ellipsisWidth = ctx.measureText( ellipsis ).width;
            if ( width <= maxWidth || width <= ellipsisWidth ) {
                return { width: width, text: text };
            } else {
                var len = text.length;
                while ( width >= maxWidth - ellipsisWidth && len-- > 0) {
                    text = text.substring( 0, len );
                    width = ctx.measureText( text ).width;
                }
                return { width: ctx.measureText( text + ellipsis).width, text: text + ellipsis };
            }
        },*/

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
                return 50//35;
            } else {
                return 100//60;
            }
        },

        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        debounce: function ( func, wait, immediate ) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply( context, args );
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        },

        throttle: function ( callback, limit ) {
            var wait = false,
                self = this;
            return function () {
                if ( !wait ) {
                    callback.apply( this, arguments );
                    wait = true;
                    setTimeout( function () {
                        wait = false;
                    }, limit );
                }
            };
        }

    };

    return utils;

} );
