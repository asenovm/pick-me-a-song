'use strict';

angular.module('pickMeASong')
    .directive('starRatingInit', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            $(element).rating({ showClear: false, showCaption: false, size: 'sm', glyphicon: false, hoverEnabled: false });
        }
    };
});
