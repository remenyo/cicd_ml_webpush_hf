<template>
    <button @click="subscribe">Feliratkozás értesítésekre</button>
  </template>
  
  <script>
  export default {
    methods: {
      async subscribe() {
        // Web push feliratkozás logikája
        // ...
  
        // Feliratkozási adatok küldése a backendnek
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            // process.env.VUE_APP_VAPID_PUBLIC_KEY
            "AAAA" // TODO:
        ),
        });
  
        await fetch("/api/subscribe", {
          method: "POST",
          body: JSON.stringify(subscription),
          headers: {
            "Content-Type": "application/json",
          },
        });
  
        alert("Sikeres feliratkozás");
      },
    },
  };
  </script>
  