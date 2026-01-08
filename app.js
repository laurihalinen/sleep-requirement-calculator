async function loadData() {
  return new Promise((resolve, reject) => {
    Papa.parse('./data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        const data = result.data;
        console.log(
          'Työtunnit vs Unentarve:',
          data.map((row) => [row.WorkHours, row.SleepTime])
        );
        console.log('Data ladattu:', data);

        // Tarkistetaan, että kaikki arvot ovat numeroita
        const verifiedData = data.filter((row) =>
          Object.values(row).every(
            (val) => typeof val === 'number' && !isNaN(val)
          )
        );

        if (verifiedData.length === 0) {
          console.error(
            'Datassa virheellisiä arvoja : arvon tulisi olla number-tyyppiä'
          );
          reject('Virheellistä dataa');
        }

        resolve(verifiedData);
      },
      error: (err) => reject(err),
    });
  });
}

// luodaan malli ja koulutetaan se
async function createModel(data) {
  data = await loadData();
  const inputs = data.map((item) => [
    item.WorkoutTime,
    item.ReadingTime,
    item.PhoneTime,
    item.WorkHours,
    item.Caffeine,
    item.RelaxationTime,
  ]);

  const labels = data.map((item) => item.SleepTime);

  //tulostetaan data consoleen ennen tensoriksi muuttamista
  console.log('Syötteet (inputs):', inputs);
  console.log('Kohdearvot (labels):', labels);

  const inputTensor = tf.tensor2d(inputs);
  const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

  // mallin luonti
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [6], units: 6, activation: 'relu' }));
  // hidden layerit
  model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2, activation: 'relu' }));
  // output layer
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError',
  });

  console.log('Koulutetaan mallia...');
  await model.fit(inputTensor, labelTensor, { epochs: 100, shuffle: true });
  console.log('Malli koulutettu!');
  return model;
}

// itse unentarpeen ennustava funktio
async function predictSleepTime(model) {
  const workoutTime = parseFloat(document.getElementById('workoutTime').value);
  const readingTime = parseFloat(document.getElementById('readingTime').value);
  const phoneTime = parseFloat(document.getElementById('phoneTime').value);
  const workHours = parseFloat(document.getElementById('workHours').value);
  const caffeine = parseFloat(document.getElementById('caffeine').value);
  const relaxationTime = parseFloat(
    document.getElementById('relaxationTime').value
  );

  const inputTensor = tf.tensor2d([
    [workoutTime, readingTime, phoneTime, workHours, caffeine, relaxationTime],
  ]);
  const prediction = model.predict(inputTensor);

  // ennusteen tulostus tensorina
  prediction.print();

  const predictedValue = (await prediction.array())[0][0];

  console.log(`Ennustettu unentarve: ${predictedValue.toFixed(2)} tuntia`);
  document.getElementById('predictionOutput').textContent =
    predictedValue.toFixed(2);
}

(async function run() {
  const model = await createModel();
  document.getElementById('predictionWait').textContent = 'Malli koulutettu!';

  document
    .getElementById('predictionForm')
    .addEventListener('submit', async (event) => {
      event.preventDefault();
      await predictSleepTime(model);
    });
})();
