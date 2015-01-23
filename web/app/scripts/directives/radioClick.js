'use strict';

angular.module('pickMeASong')
    .directive('radioClick', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element),
                $others = $element.siblings(),
                value = JSON.parse(attrs.radioClick);

            if($scope.isCollaborativeFilteringUsed === value) {
                $element.addClass('active');
                $others.removeClass('active');
            }

            $element.on('touchstart click', function () {
                $scope.setCollaborativeFilteringUsed(value);
            });
        }
    };
});
