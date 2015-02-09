'use strict';

angular.module('pickMeASong')
  .controller('SettingsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    $scope.isCollaborativeFilteringUsed = recommendationsService.getCollaborativeFilteringUsed();
    $scope.areArtistsUsed = recommendationsService.getArtistsUsed();

    $scope.saveNeighboursCount = function () {
        recommendationsService.setNeighboursCount($scope.neighboursCount);
    };

    $scope.setValue = function (key, value) {
        if(key === 'isCollaborativeFilteringUsed') {
            $scope.setCollaborativeFilteringUsed(value);
        } else if (key === 'areArtistsUsed') {
            $scope.setArtistsUsed(value);
        }
    };

    $scope.setArtistsUsed = function (value) {
        $scope.$apply(function () {
            $scope.areArtistsUsed = value;
        });
        recommendationsService.setArtistsUsed(value);
    };

    $scope.setCollaborativeFilteringUsed = function (value) {
        $scope.$apply(function () {
            $scope.isCollaborativeFilteringUsed = value;
        });
        recommendationsService.setCollaborativeFilteringUsed(value);
    };

    $scope.saveRecommendedItemsCount = function () {
        recommendationsService.setRecommendedItemsCount($scope.recommendedItemsCount);
    };

  }]);
