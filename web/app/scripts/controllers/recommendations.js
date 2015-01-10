'use strict';

angular.module('pickMeASong')
  .controller('RecommendationsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.recommendations = recommendationsService.getRecommendations();

  }]);
