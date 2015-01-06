'use strict';

angular.module('pickMeASong')
  .controller('RecommenderController', ['$http', '$scope', function ($http, $scope) {
    $scope.bands = [{}];

    $scope.getRecommendations = function () {
        $http({
            url: 'http://localhost:3000/recommendations',
            method: 'GET',
            params: { bands: JSON.stringify($scope.bands) }
        }).success(function (data, status, headers, config) {
            console.log('success is called with data = ');
            console.dir(data);
        }).error(function (data, status, headers, config) {
            console.log('error is called with data = ');
            console.dir(data);
        });
    };
  }]);
