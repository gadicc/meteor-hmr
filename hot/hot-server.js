if (process.env.NODE_ENV === 'production' || Meteor.isTest)
  return;

Meteor.settings.public.HOT_PORT = parseInt(process.env.HOT_PORT);
