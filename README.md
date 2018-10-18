## Go Serverless! Realizza la tua applicazione di filesharing

L’applicazione che andremo a realizzare è composta da un front-end e un back-end.

Il front-end è una **single page application** di cui effettueremo il deploy su **S3** e che sarà servita mediante **CloudFront**. Il back-end invece è una API REST realizzata con **API Gateway** e **Lambda**.

Per realizzare l’infrastruttura occorre effettuare il provisioning e la configurazione delle seguenti risorse AWS:

###front-end
- Un bucket S3 privato per il front-end
- Una distribuzione di CloudFront con il permesso di accedere al bucket S3

###back-end
- Una funzione lambda per testare l’integrazione
- Una Cognito User Pool
- Un Bucket S3 privato per gli upload degli utenti
- Una tabella DynamoDB
- Una API di API Gateway

<br>

##PREPARAZIONE DEL FRONT-END
Per prima cosa andiamo a creare un bucket **S3** dove caricare l’applicazione **javascript e html** per il front-end.

Lo stesso bucket sarà la **sorgente** per la distribuzione di **CloudFront**.

Il bucket può essere **privato**, configureremo la distribuzione in modo da consentire a **CloudFront l’accesso al bucket S3**.

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_151524.png)

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_151610.png)

Dopo aver impostato i seguenti parametri è possibile caricare un semplice file di prova, che useremo per verificare il corretto funzionamento del front-end.

Create un semplice file di testo con estensione **.html** e incollate il seguente testo:

<br>

```
<html>
      <head>
            <title>Esempio</title>
      </head>

      <body>
             <h1>It Works</h1>
             <hr/>
             <p>This is a simple test page</p>
      </body>
</html>
```

Salviamo questo file come `index.html` e carichiamolo nel bucket appena creato.

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_152324.png)

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_152339.png)

Come si può notare al file **NON** viene data `public read`, per questo motivo una volta ultimate le operazioni per la creazione del bucket S3 occorre creare una distribuzione CloudFront che lo utilizzi come origine. 

Questo ci permetterà di distribuire il file che abbiamo caricato, che non è al momento accessibile.

Nella configurazione della distribuzione è importante abilitare l’opzione `Restrict Bucket Access` per mantenere il bucket S3 privato.

Al fine di consentire al servizio CloudFront di accedere al bucket in lettura bisogna provvedere ad attivare e configurare l’opzione  `Origin Access Identity`; è possibile delegare al wizard la creazione di una Access Identity e l’aggiornamento della Bucket Policy.

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_153854.png)

Per quanto riguarda le impostazioni del comportamento di caching attiviamo il `redirect di http su https` e abilitiamo la `compressione automatica dei contenuti serviti` per **migliorare le performance**.

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_153939.png)

Non bisogna dimenticare di indicare quale file servire di **default** se non indicato, ed impostarlo ad `index.html`

<br>

![alt text](https://blog.besharp.it/wp-content/uploads/2018/09/SS_19-09-2018_153959.png)

Il processo di creazione della distribuzione può richiedere diversi minuti.

In alcuni casi, anche dopo l’attivazione della distribuzione potrebbe essere visualizzato un errore di accesso, tuttavia si tratta di una situazione transitoria dovuta ai tempi di propagazione DNS, e si risolve autonomamente entro qualche minuto. [Può richiedere fino ad un ora]

Quando la distribuzione sarà pronta è possibile ottenere l’url pubblico e testare il deploy del front-end navigando a quell’indirizzo.

Dovrebbe essere visualizzata la pagina di esempio che abbiamo caricato nei passaggi precedenti.

Il front-end è quindi pronto. Il contenuto del bucket viene servito in modo efficiente e cost effective attraverso la CDN; per aggiornare l’applicazione basta caricarla su S3.

_Attenzione! se si modificano file già presenti occorre invalidare la cache della distribuzione per vedere gli aggiornamenti._

##Abilitare la Pipeline di Deploy per il front-end

Per essere più rapidi nel visualizzare le nostre modifiche al front-end anche online procediamo a creare una pipeline di Deploy per la nostra soluzione.

###Creare un nostro repository su codecommit

Per far funzionare la nostra pipeline di Deploy abbiamo bisogno di un repository dove pushare le modifiche al nostro codice. 

Per prima cosa **cloniamo** il progetto di front-end dal repository **git** del workshop:

[https://github.com/besharpsrl/serverless-day-fe](https://github.com/besharpsrl/serverless-day-fe)

Quindi accediamo alla nostra Sandbox di AWS e andiamo sul servizio **CodeCommit** per creare il nostro **repository**

![alt text](https://s3-eu-west-1.amazonaws.com/static.besharp.it/Screen+Shot+2018-10-18+at+12.19.30.png)

Una volta creato il repository, **clonatelo in locale** e caricate tutti i file della soluzione scaricata da **.git**. Ora prepariamo il servizio di **CodeBuild** per gestire il nostro _buildspec.yml_ presente nella ROOT di progetto.

Il **CodeBuild di front-end** può utilizzare **un’immagine standard di nodejs**:

![alt text](https://blog.besharp.it/wp-content/uploads/2018/10/SS_09-10-2018_114259.png)

Seguite i settaggi dell'immagine come riferimento.

Il file **buildspec.yml** definisce i passi eseguiti da CodeBuild per produrre il pacchetto di cui effettuare il deploy ed anche le istruzioni di deploy stesse.

Una volta creata l' applicazione su CodeBuild, basta creare la Pipeline che faccia il source da CodeCommit e poi passi il codice al corrispondente CodeBuild. 

**In nessuna delle pipeline che creeremo (front-end e back-end) occorre specificare lo stadio di deploy**, perchè per questo esempio abbiamo **incluso le istruzioni nel buildspec.yml** in modo che siano eseguite **dopo il processo di build**.

Di conseguenza, lo IAM role associato al CodeBuild deve avere il permesso di **caricare ed eliminare** file da **S3** e **invalidare la distribuzione di CloudFront**.

Analizzando il buildspec possiamo osservare le operazioni eseguite per il build e deploy dell' applicazione.


```
- npm install
- npm run build
- cd ./build && aws s3 sync --delete . s3://$S3_BUCKET_NAME/
- aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

In ordine:

1. Installare le dipendenze
2. Creare il pacchetto di React.js
3. Sincronizzare l’output della build con il bucket s3 del front-end (ovvero aggiornare i file presenti, aggiungere quelli nuovi ed eliminare quelli non più presenti)
4. Invalidare il contenuto della distribuzione CloudFront per rendere effettive le modifiche.

Come possiamo vedere abbiamo **2 variabili d'ambiente da configurare su CodeBuild**:

- $S3_BUCKET_NAME
- $DISTRIBUTION_ID

Queste vanno configurate rispettivamente con il nome del bucket S3 su cui volete salvare il vostro progetto front-end e l'id della distribuzione CloudFront che avete creato.

A questo punto dobbiamo creare la pipeline di Build.

Andiamo sul servizio **CodePipeline** e creiamo una nuova _pipeline_. 

1. Scegliamo il `nome` della pipeline.
2. Scegliamo `New Service role` per fargli creare un ruolo apposito.
3. Per l'artifact scegliamo `Default Location`.
4. Come _Source Provider_ scegliamo `AWS CodeCommit`, quindi il **repository che abbiamo creato precedentemente** ed infine il **branch di sviluppo**.
5. Come passo di Build scegliere `AWS CodeBuild` e quindi selezioniamo il progetto CodeBuild creato precedentemente.
6. Infine per il passo di Deploy come detto scegliamo `Skip`.
7. Alla Review cliccare `Create pipeline`.

##Il front-end
Una parte fondamentale dell’applicazione è rappresentata dal front-end, applicazione scritta in React.js che permette all’utente di loggarsi in un’area sicura, caricare, condividere e scaricare documenti.

Seguendo questa guida sarà possibile integrare il front-end con il nostro back-end serverless in modo da permettere alle azioni compiute dall’utente in interfaccia di riflettersi realmente su S3 e sulle tabelle di DynamoDB.

Per cominciare, recuperiamo il codice sorgente clonato dal repository. La struttura del pacchetto deve rispecchiare quanto segue:

![alt text](https://blog.besharp.it/wp-content/uploads/2018/10/unnamed.png)

Assicuriamoci di essere nella root di progetto di modo da poter lanciare i seguenti comandi:

```
npm install
npm start
```
Possiamo quindi procedere a configurare la libreria AWS Amplify.

Amplify è una libreria consigliata da AWS che solleva il programmatore dalla gestione nel dettaglio di alcuni aspetti del ciclo di vita dell’applicazione legati ad Amazon AWS, in particolare, nel nostro caso specifico, i servizi Cognito, S3 e API Gateway.

Per configurare correttamente il tutto abbiamo provveduto a creare un semplice custom component che ha la funzione di file di configurazione:

![alt text](https://blog.besharp.it/wp-content/uploads/2018/10/unnamed-1.png)

Come si può vedere, tutti i parametri di configurazione di Aws Amplify sono contenuti qui e vanno sostituiti con id e arn delle risorse create nell’articolo precedente.

Una volta completata la configurazione ed installate tutte le dipendenze, possiamo avviare l’applicazione e visualizzare la seguente schermata di login:


![alt text](https://blog.besharp.it/wp-content/uploads/2018/10/unnamed-2.png)

Se aggiungiamo manualmente degli utenti nella **CognitoUserPool** sarà possibile effettuare login e visualizzare la schermata principale dell’applicazione.

![alt text](https://blog.besharp.it/wp-content/uploads/2018/10/main_view.png)