module.exports = {
  loginCred:{
    EMAIL: process.env.EMAIL,
    PASSWORD: process.env.PASSWORD
  },

  siteInfo: {
    COUNTRY_CODE: process.env.COUNTRY_CODE || 'en-ca',
    SCHEDULE_ID: process.env.SCHEDULE_ID,
    FACILITIES: process.env.FACILITIES,
    
    get LOGIN_URL () {
      return `https://ais.usvisa-info.com/${this.COUNTRY_CODE}/niv/users/sign_in`
    }
  },
  IS_PROD: process.env.NODE_ENV === 'prod',
  NEXT_TRY: process.env.NEXT_TRY || 300, // default to 30 seconds
  NEXT_SCHEDULE_POLL: process.env.NEXT_SCHEDULE_POLL || 30, // default to 30 seconds
  MAX_NUMBER_OF_POLL: process.env.MAX_NUMBER_OF_POLL || 250, // number of polls before stopping
  NOTIFY_ON_DATE_BEFORE: process.env.NOTIFY_ON_DATE_BEFORE, // in ISO format i.e YYYY-MM-DD

  NOTIFY_EMAILS: process.env.NOTIFY_EMAILS, // comma separated list of emails
  mailgun: {
    USERNAME: process.env.MAILGUN_USERNAME,
    DOMAIN: process.env.MAILGUN_DOMAIN,
    API_KEY: process.env.MAILGUN_API_KEY,
  }
}
