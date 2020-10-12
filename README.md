# standalone-single-spa-webpack-plugin

A webpack plugin for running single-spa microfrontends in standalone mode. This is an alternative to using [import-map-overrides](https://github.com/joeldenning/import-map-overrides).

> **⚠️ Warning: Experimental**
>
> This plugin should be considered "experimental" in that the core team has not yet settled on a consensus as to if 'standalone mode' is how local development should be approached. Generally speaking, developers want this because "that's the way we used to do it". **There are potential pitfalls that you should understand before deciding to use this plugin.**
>
> - 'standalone' also means isolated which may lead to situations of "works on my machine, but not on the deployed environment."
> - The import map used in this plugin's configuration may quickly become outdated if you use any sort of versioning (which is recommended as a best-practice in general). This may lead to developing locally against a package whose API has changed.
> - Performance problems may not manifest until the application is in an integrated environment.
> - All of these may add up leading to developer frustration and erosion of trust.
> - The core team reserves the right to deprecate this plugin based on the feedback we receive from single-spa users.

## Installation

```sh
npm install --save-dev standalone-single-spa-webpack-plugin

# alternatively
yarn add --dev standalone-single-spa-webpack-plugin
```

## Usage

To use the plugin, add it to your webpack config. Then when you run webpack-dev-server, an HTML file will be generated that loads and mounts your microfrontend as a single-spa application or parcel.

```js
// webpack.config.js
const StandaloneSingleSpaPlugin = require('standalone-signle-spa-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    // Not required, but it's often useful to run webpack-dev-server in SPA mode
    historyApiFallback: true
  },
  plugins: [
    // the standalone plugin works in conjunction with HtmlWebpackPlugin
    new HtmlWebpackPlugin(),

    new StandaloneSingleSpaPlugin({
      // required
      appOrParcelName: "my-microfrontend-name",

      // optional - strongly encouraged for single-spa applications
      activeWhen: ['/route-prefix'],

      // optional - useful for enabling cross-microfrontend imports
      importMapUrl: new URL("https://my-cdn.com/importmap.json"),

      // optional - useful for adding an additional, local-only import map
      importMap: {
        imports: {
          "other-module": "/other-module.js"
        }
      },

      // optional - defaults to false. This determines whether to mount
      // your microfrontend as an application or a parcel
      isParcel: false

      // optional - you can disable the plugin by passing in this boolean
      disabled: false

      // optional - the standalone plugin relies on optionalDependencies in the
      // package.json. If this doesn't work for you, pass in your HtmlWebpackPlugin
      // to ensure the correct one is being referenced
      HtmlWebpackPlugin
    })
  ]
}
```

Now when you run `npm start` or `npm run serve`, you can view your code running on localhost, without setting up an import map override.

## Notes

This plugin (currently) assumes that you are using SystemJS to load your microfrontends. If you are not using SystemJS and would like to use this plugin, please file a Github issue.
