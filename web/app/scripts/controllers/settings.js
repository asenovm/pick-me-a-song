'use strict';

angular.module('pickMeASong')
  .controller('SettingsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.isCollaborativeFilteringUsed = recommendationsService.getCollaborativeFilteringUsed();

    $scope.saveNeighboursCount = function () {
        recommendationsService.setNeighboursCount($scope.neighboursCount);
    };

    $scope.setCollaborativeFilteringUsed = function (value) {
        recommendationsService.setCollaborativeFilteringUsed(value);
    };

    $scope.saveRecommendedItemsCount = function () {
        recommendationsService.setRecommendedItemsCount($scope.recommendedItemsCount);
    };

  }]);
