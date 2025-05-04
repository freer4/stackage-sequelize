const { Sequelize } = require("sequelize");
//TODO probably don't need this at all
/**
 * Extends base sequelize so we can capture setup to understand
 * the model structure in Stackage. 
 */
class StackageSequelize extends Sequelize{
    constructor(a){
        const baseClass = super(a);

        this.__definitions = [];
        this.__associations = [];
        const baseDefine = super.define;

        this.define = function(
            modelName,
            attributes,
            options
        ){
            this.__definitions.push({
                modelName,
                attributes,
                options, 
            });
            return baseDefine.call(baseClass, modelName, attributes, options);
        }
    }
}

module.exports = StackageSequelize;