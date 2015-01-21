'use strict';

angular.module('pickMeASong')
  .controller('SettingsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.saveNeighboursCount = function () {
        recommendationsService.setNeighboursCount($scope.neighboursCount);
    };

    $scope.saveRecommendedItemsCount = function () {
        recommendationsService.setRecommendedItemsCount($scope.recommendedItemsCount);
    };

  }]);
