var Constants = {
  Calendar: {
    Formats: {
      Time: 'h:mm a',
      Date: 'ddd, MMMM D YYYY'
    }
  },
  Weather: {
    ApiKey: '99f4af1f8d31e96dda4a72bfec4d1cd0',
    RefreshInterval: 1000 * 60 * 60,
    DefaultCoordinates: [28.542985, 77.204866],
    DefaultCity: 'New Delhi'
  },
  Feed : {
    Url: 'https://news.google.com/news?cf=all&hl=en&pz=1&ned=in&topic=tc&output=rss',
    //Url: '//hr-pulsesubscriber.appspot.com/items?feed=curated://top_read_News',
    //Url: 'http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', <-- this rss sucks..
    RefreshInterval : 1000 * 60 * 5,
    AppearDuration : 1000 * 5,
    FadeTransitionInterval : {
      Enter: 1000,
      Leave: 400
    }
  }
}

module.exports = Constants;
