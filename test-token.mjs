const token = "IGAAbapUwTzsFBZAGJRR2ZAOR3pVWUYxdHp2YURaUlRrN0J0ODJvUTNRaXhfWGFKdDFqaklkUDdBVmc5ZAUFYYlRoanBqc1NMNW9VV2ZAjSUo5SjJKNTVaRVMzZAFh5RWRQbkhrekJpekQycTBKTHZAHdFU2UU9n";
const url = `https://graph.instagram.com/me/media?fields=id,caption,media_url&access_token=${token}`;

fetch(url)
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));