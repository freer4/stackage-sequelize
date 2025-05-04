const express = require('express');

//Why not just automate all the controller setup based on models? 
//Because the individual controllers will need "adjusting" to perform
//more specific operations, maybe mutation or filtering of data. 
//Having each controller defined manually allows straightforward 
//extension of that controller. That said, it's like 4 lines to set up a 
//controller using the base class here... 

/**
 * Scaffolds the basic controller endpoints for a given model
 * @param {sequelize} sequelize the Sequelize db connection to use
 * @param {String} modelName the defined model to use
 */
class ControllerBase extends express.Router{
    constructor(sequelize, modelName){
        super();

        /**
         * Gets all records for this model
         */
        this.get('/all', function(request, response, next) {
            response.send(`Get all for ${modelName}`);
            next();
        });

        /**
         * Gets all ids for this model
         */
        this.get('/all-ids', function(request, response, next) {
            response.send(`Get all ids for ${modelName}`);
            next();
        });

        /**
         * Gets records for the provided list of ids
         */
        this.get('/list/:ids', function(request, response, next) {
            response.send(`Get ${modelName}: ${request.params.ids}`);
            next();
        });

        /** 
         * Gets record by id   
         */
        this.get('/:id', function(request, response, next) {
            response.send(`Get ${modelName}: ${request.params.id}`);
            next();
        });

        /**
         * Creates or updates one record
         */
        this.post('/save', function(request, response, next){
            response.send(`Post one record for ${modelName}`);
            next();
        });

        /**
         * Creates or updates all passed records
         */
        this.post('/save-many', function(request, response, next){
            response.send(`Post many records for ${modelName}`);
            next();
        });

        /**
         * Deletes one record by id
         */
        this.post('/delete/:id', function(request, response, next){
            response.send(`Deletes one record for ${modelName}: ${request.params.id}`);
            next();
        });

        /**
         * Deletes many records by ids
         */
        this.post('/delete-many/:ids', function(request, response, next){
            response.send(`Deletes many records for ${modelName}: ${request.params.ids}`);
            next();
        });
        

    }
}


module.exports = ControllerBase;