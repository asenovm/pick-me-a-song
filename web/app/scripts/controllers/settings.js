'use strict';

angular.module('pickMeASong')
  .controller('SettingsController', ['$scope', 'recommendationsService', function ($scope, recommendationsService) {

    var KEY_COLLABORATIVE_FILTERING = 'isCollaborativeFilteringUsed';
    var KEY_ARTISTS = 'areArtistsUsed';

    $scope.isCollaborativeFilteringUsed = recommendationsService.getCollaborativeFilteringUsed();
    $scope.areArtistsUsed = recommendationsService.getArtistsUsed();

    $scope.saveNeighboursCount = function () {
        recommendationsService.setNeighboursCount($scope.neighboursCount);
    };

    $scope.setValue = function (key, value) {
        if(key === KEY_COLLABORATIVE_FILTERING) {
            $scope.setCollaborativeFilteringUsed(value);
        } else if (key === KEY_ARTISTS) {
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
