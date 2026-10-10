# Does an Android TV remote app work on a Fire TV Stick?

Remote apps built for Android TV and Google TV, including The Remote, don't work with Fire TV. Fire TV Sticks and Fire TV Edition TVs run Amazon's Fire OS, not Google TV. Use Amazon's own Fire TV app on your phone instead.

## Fire TV runs Fire OS, not Google TV

Fire OS is Amazon's own system. It doesn't have the Android TV Remote Service that Android TV and Google TV phone remotes connect to. So a remote app made for Google TV won't find a Fire TV Stick or pair with it. Home Assistant's Android TV Remote documentation makes the same point. [Home Assistant: Android TV Remote](https://www.home-assistant.io/integrations/androidtv_remote/)

That includes TVs with Fire TV built in, sold under other brands. If the home screen says Fire TV, this applies.

## Amazon's Fire TV app is the phone remote for Fire TV

Amazon makes a free Fire TV app for Android and iPhone. Put your phone on the same Wi-Fi as the Fire TV, open the app, pick your device, and type the code shown on the TV. Its listing says it needs an Amazon account. [Amazon Fire TV app](https://play.google.com/store/apps/details?id=com.amazon.storm.lightning.client.aosp&hl=en_IN)

If your router uses advanced settings, Amazon's guide says multicast support needs to be on for the app to connect. [Amazon Fire TV user guide (PDF)](https://d1ergij2b6wmg5.cloudfront.net/Amazon+Fire+TV+User+Guides/Amazon+Fire+TV+Device+Documentation/Amazon_Fire_TV_User_Guide.pdf)

## The Remote is for Android TV and Google TV only

The Remote works with Android TV and Google TV devices that support Android TV Remote Service v2. It doesn't support Fire TV, Roku or Apple TV, and there's no iPhone version.

## Not sure which one you have?

Check the home screen and the settings menu. Here's [how to tell if your TV is Android TV or Google TV](https://theremote-site.pages.dev/guides/is-my-tv-android-tv-or-google-tv/).

If you also have a Google TV or Android TV in the house, The Remote is a free phone remote for it, with no ads and no account. [Download the app](https://theremote-site.pages.dev/#download)
