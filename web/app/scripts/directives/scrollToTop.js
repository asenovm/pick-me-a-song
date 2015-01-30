'use strict';

angular.module('pickMeASong')
    .directive('scrollToTop', function () {
    return {
        restrict: 'A',
        link: function ($scope, element, attrs) {
            var $element = $(element),
                $window = $(window),
                $screen = $('html, body');

            $window.scroll(function () {
                if ($(this).scrollTop() > 100) {
                    $element.fadeIn();
                } else {
                    $element.fadeOut();
                }
            });

            $element.click(function () {
                $screen.animate({ scrollTop: 0 }, 800);
                return false;
            });
        }
    };
});
