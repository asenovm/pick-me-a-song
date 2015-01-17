'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', 'localStorageService', function ($http, $q, $localStorage) {

    var KEY_RECOMMENDED_ITEMS = "recommendedItems";
    var recommendations = [];

    this.getRecommendations = function () {
        if(_.isEmpty(recommendations)) {
            return $localStorage.get(KEY_RECOMMENDED_ITEMS);
        }
        return recommendations;
    };

    this.fetchRecommendations = function (artists) {
        var deferred = $q.defer();

        $http({
            url: '/recommendations',
            method: 'GET',
            params: { artists: JSON.stringify(artists) }
        }).success(function (data, status, headers, config) {
            recommendations = data;
            $localStorage.set(KEY_RECOMMENDED_ITEMS, recommendations);
            deferred.resolve(data);
        }).error(function (data, status, headers, config) {
            $localStorage.set(KEY_RECOMMENDED_ITEMS, []);
            deferred.reject(data);
        });

        return deferred.promise;
    };

}]);
