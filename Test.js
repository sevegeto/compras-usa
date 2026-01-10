function testWebhookSimulation() {
  const fakeNotification = {
    postData: {
      contents: JSON.stringify({
        topic: 'items',
        resource: '/items/MLM123456789' // Replace with real item ID
      })
    }
  };
  
  const result = doPost(fakeNotification);
  Logger.log(result.getContent());
}

