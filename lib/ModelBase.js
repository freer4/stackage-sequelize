const { DataTypes } = require("sequelize");

class ModelBase extends Object{
    constructor(config = {}, idType = DataTypes.INTEGER){
        super(config);

        if (idType === DataTypes.INTEGER){
            this.id = {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,                
            }
        }
        if (idType === DataTypes.UUID){
            this.id = {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,              
            }
        }
        //createdAt / updatedAt are already handled by Sequelize

        Object.assign(this, config);
    }
}

module.exports = ModelBase;