console.log('selfAccept loaded', module.hot && module.hot.data);

if (module.hot) {

  module.hot.accept();

  module.hot.dispose(function(data) {
    data.something = 1;
  });

}