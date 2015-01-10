'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', function ($http) {

    this.getRecommendations = function (artists) {
        $http({
            url: 'http://localhost:3000/recommendations',
            method: 'GET',
            params: { artists: JSON.stringify(artists) }
        }).success(function (data, status, headers, config) {
            console.log('success is called with data = ');
            console.dir(data);
        }).error(function (data, status, headers, config) {
            console.log('error is called with data = ');
            console.dir(data);
        });
    };

}]);
