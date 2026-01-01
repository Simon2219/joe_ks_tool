/**
 * Database Models Index
 * Exports all database models
 */

const UserModel = require('./User');
const RoleModel = require('./Role');
const TicketModel = require('./Ticket');
const QualityModel = require('./Quality');
const SettingsModel = require('./Settings');
const RefreshTokenModel = require('./RefreshToken');
const IntegrationCredentialsModel = require('./IntegrationCredentials');

module.exports = {
    UserModel,
    RoleModel,
    TicketModel,
    QualityModel,
    SettingsModel,
    RefreshTokenModel,
    IntegrationCredentialsModel
};
