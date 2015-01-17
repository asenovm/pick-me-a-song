'use strict';

angular.module('pickMeASong')
  .controller('RecommendationsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.recommendations = recommendationsService.getRecommendations();

    $scope.onLikeClicked = function (track, $event) {
        var $target = $(event.target);
        if($target.hasClass('btn-warning')) {
            $target.removeClass('btn-warning').addClass('btn-success').button('default');    
        } else {
            $target.addClass('btn-warning').removeClass('btn-success').button('liked');
        }
    };

  }]);
