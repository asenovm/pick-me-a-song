'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$http', '$scope', 'recommendationsService', function ($http, $scope, recommendationsService) {
    $scope.artists = [{ score: 1 }];

    $scope.getRecommendations = function () {
        recommendationsService.getRecommendations($scope.artists);
    };
  }]);
