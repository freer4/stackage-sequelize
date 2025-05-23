const DataTypes = require("sequelize/lib/data-types");
//inflection library matches Sequelize
const inflection = require( 'inflection' );
const fs = require('fs');

function mapTypes(propertyType){
    if (propertyType instanceof DataTypes.INTEGER){
        return "NUMBER";
    }
    if (propertyType instanceof DataTypes.STRING){
        return "STRING";
    }
    if (propertyType instanceof DataTypes.DATE
        || propertyType instanceof DataTypes.DATEONLY
    ){
        return "DATE"
    }

    console.warn(`Unhandled data type: ${propertyType}`);
    return "STRING";
}

function buildFileText(model, prefix){
    let buildText = "";
    buildText += "//This file was generated by stackage, do not modify directly as your changes will be lost.\r\n";
    buildText += `import Model from 'stackage-js/data-types/model';\r\n`;
    model.associatedModels.forEach(associatedModel => {
        buildText += `import ${associatedModel} from '../models/${associatedModel}.js';\r\n`;
    });

    //TODO import types
    //TODO import enums

    buildText += `class ${model.fullName} extends Model {\r\n`;
    
    buildText += `    constructor(record, config = {}){\r\n`;
    buildText += `        super(record, config);\r\n`;
    buildText += `    }\r\n\r\n`;

    buildText += `    static name = '${model.fullName}';\r\n`;
    
    if (prefix){
        buildText += `    static prefix = '${prefix}';\r\n`;
    }

    buildText += `    static source = '${inflection.underscore(model.name).replaceAll("_", "-")}';\r\n`;
    buildText += `    static dto = false;\r\n\r\n` //TODO DTO setup

    buildText += `    static get properties() {\r\n`;
    buildText += `        const value = {\r\n`;

    model.properties.forEach(property => {
        buildText += `            '${property.name}': {type: ${property.type}, config: ${JSON.stringify(property.config)}},\r\n`;
    })

    buildText += `        };\r\n`;
    buildText += `        Object.defineProperty(this, 'properties', {value});\r\n`;
    buildText += `        return value;\r\n`;
    buildText += `    }\r\n`;
    buildText += `}\r\n\r\n`;

    buildText += `window[Symbol.for(${model.fullName}.name)] = ${model.fullName};\r\n`;
    buildText += `export default ${model.fullName};`;

    return buildText;
}

/**
 * Processes Sequelize model definitions into Stackage ones 
 * @param {Sequelize || Array} models The Sequelize instance the models are attached to, or an array of models
 * @param {String} dir Path to where to save the output files 
 * @param {String} prefix A prefix to use when exporting these models, if desired
 */
function Processor(sequelize, dir, prefix = ""){
    if (!dir){
        console.warn("Must define an output directory.");
        return;
    }

    let modelsToProcess = [];
    if (Array.isArray(sequelize)){
        modelsToProcess = sequelize;
    } else {
        modelsToProcess = Object.values(sequelize.models);
    }

    console.log("--------")
    // console.log(Object.keys(modelsToProcess[2]))
    // console.log(modelsToProcess[2].options);

    const collectionBuild = [];
    const referencesBuild = [];

    //set up the basics for all the models
    modelsToProcess.forEach(model => {

        //map out associations
        Object.values(model.associations).forEach(association => {
            Object.keys(association).forEach(x => {
                if (typeof association[x] !== "object"){
                    console.log(x, ":",  association[x], typeof association[x]);
                }
            })
            console.log("---")

            //TODO basically all custom-defined FK fields are not tested
            switch (association.associationType){
                case "BelongsToMany":
                    //we skip through auto-generated through tables, and manually
                    //defined ones will be handled with the through table relationships

                    //if throughModel and all properties of throughModel were auto-generated
                    if (association.throughModel 
                        && !Object.values(association.throughModel.tableAttributes).some(x => !x._autoGenerated)){
                        console.log(`model ${model.tableName} found many ${association.source.tableName} to many ${association.target.tableName}`);
                        referencesBuild.push({
                            type: "many",
                            model: model.tableName,
                            property: association.as,
                            key: `${association.as}Ids`,
                            owner: false, //owner is through table
                        })
                    } else {
                        console.log(`many to one`);
                    }
                break;

                case "HasMany":
                    console.log(`${model.tableName} has many ${association.as}`);
                    referencesBuild.push({
                        type: "many",
                        model: model.tableName,
                        property: association.as,
                        key: `${association.as}Ids`,
                        owner: false //owner is belongs to side
                    })
                break;

                case "HasOne":
                case "BelongsTo":
                    //TODO Reverse could be defined separately, and would interfere with inferred relationship
                    console.log(`${model.tableName} ${association.associationType} ${association.as}`)
                    const owner = association.foreignKey === association.identifier;//TODO test this assumption
                    referencesBuild.push({
                        type: "one",
                        model: model.tableName,
                        property: association.as,
                        key: owner ? association.foreignKey : `${association.as}Id`, //owner uses defined key, virtual uses inferred
                        owner 
                    })
                break;

                default:
                    console.log("Unhandled type:", association.associationType)
            }
            console.log("--------")
        })
        
        //Map all model attributes
        const modelBuild = {
            properties: [],
            name: model.tableName,
            fullName: `${prefix}${model.tableName}Model`,
            primaryKey: model.primaryKeyAttribute,
            associatedModels: [],
        };
        Object.values(model.tableAttributes).forEach(property => {
            console.log(property.fieldName);
            const buildProperty = {}
            buildProperty.name = property.fieldName;
            buildProperty.type = mapTypes(property.type);
            buildProperty.config = {
                nullable: !!property.allowNull, //TODO beefier config
            }
            modelBuild.properties.push(buildProperty);
        });

        collectionBuild.push(modelBuild);

    });

    //Update model attributes with references
    referencesBuild.forEach(reference => {
        
        const baseType = `${prefix}${reference.property}Model`;
        const camelizedProperty = inflection.camelize(reference.property, true);
        const camelizedKey = inflection.camelize(reference.key, true);

        const buildRefProperty = {};
        buildRefProperty.name = camelizedProperty;
        buildRefProperty.type = reference.type === 'many' ? `[${baseType}]` : baseType;
        buildRefProperty.config = {
            nullable: !!reference.allowNull, //TODO also this is wrong, on prop not ref
            foreignKey: camelizedKey
        }
        
        const buildKeyProperty = {};
        buildKeyProperty.name = camelizedKey;
        buildKeyProperty.type = reference.type === 'many' ? "[NUMBER]" : "NUMBER"; //TODO get actual type
        buildKeyProperty.config = {
            nullable: !!reference.allowNull, //TODO also this is wrong, on prop not ref
            foreignKeyFor: camelizedProperty,
        }

        const left = collectionBuild.find(model => model.name === reference.model);
        if (!left){ //TODO tests for all these
            console.warn(`Cannot find model '${model.name}'`)
            return;
        }
        const testProp = reference.property.charAt(0).toUpperCase() + reference.property.slice(1);
        if (Object.keys(left.properties).includes(testProp)){
            console.warn(`Reference property '${reference.property}' already exists on '${left.name}'`);
        }
        const testKey = reference.key.charAt(0).toUpperCase() + reference.key.slice(1);
        if (Object.keys(left.properties).includes(testKey)){
            console.warn(`Reference key '${reference.key}' already exists on '${left.name}'`);
        }

        left.associatedModels.push(baseType);
        left.properties.push(buildRefProperty);
        left.properties.push(buildKeyProperty);

    })

    //create directory if necessary
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir, {recursive: true});
    }
    if(!fs.existsSync(`${dir}/models`)){
        fs.mkdirSync(`${dir}/models`, {recursive: true});
    }
    collectionBuild.forEach(model => {
        const text = buildFileText(model);
        fs.writeFile(`${dir}/models/${model.fullName}.js`, text, (err) => {
            if (err){
                console.log(err);
                return;
            }
            //TODO error handling
        })
    });
}

module.exports = Processor;