# ioBroker.ViessmannConnector
ioBroker ViessmannConnector

## Prerequirements

To run the connector you need to install the Javascript Script Engine adapter.

The following data points must be created:

- **javascript.0.custom.Viessmann.AccessToken** - current access token
- **javascript.0.custom.Viessmann.ClientID** - your API client ID
- **javascript.0.custom.Viessmann.DeviceID** - your device ID
- **javascript.0.custom.Viessmann.GatewaySerial** - your gateway serial
- **javascript.0.custom.Viessmann.InstallationID** - your installation ID
- **javascript.0.custom.Viessmann.RefreshToken** - a refresh token to generate a new access token (currently only 180 days TTL)

To get your API client ID see https://developer.viessmann.com/start.html for further details.
