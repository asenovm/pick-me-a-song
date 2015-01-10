'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', function ($http, $q) {

    this.getRecommendations = function (artists) {
        var deferred = $q.defer();

        $http({
            url: 'http://localhost:3000/recommendations',
            method: 'GET',
            params: { artists: JSON.stringify(artists) }
        }).success(function (data, status, headers, config) {
            deferred.resolve(data);
        }).error(function (data, status, headers, config) {
            deferred.reject(data);
        });

        return deferred.promise;
    };

}]);
