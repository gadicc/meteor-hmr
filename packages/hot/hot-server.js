if (process.env.NODE_ENV !== 'development' || Meteor.isTest)
  return;

Meteor.settings.public.HOT_PORT = parseInt(process.env.HOT_PORT);
