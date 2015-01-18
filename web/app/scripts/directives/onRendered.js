'use strict';

angular.module('pickMeASong')
    .directive('onRendered', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element);
            if($scope.track.liked) {
                $element.removeClass('btn-success').addClass('btn-warning').button('liked');
            }
        }
    };
});
