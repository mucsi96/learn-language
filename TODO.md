- Complete the missing verb forms for the A2 level.  
- Enable text selection without interfearing with draggign
- Show card
- Review card
- Show number of due cards
- Assign cards / multiperson

- Add support for image selection
- add automated dependency update

- check image cutting 
- check word type -> object



- Add support for batch card creation. When reagion is created the word is added to a cart. Then by clicking a button all for all words in the cart cards are created.


>>>
Now the card creation happens only on UI with multiple parallelel API calls. I want a possibility to do this also on servers ide itself. Please analkyze what steps are done to collect all card information. And based on that implement a single API endpoint which is replicating that on backend. each process step should run in parallel for improved performance.

on page route create a angular material floating button which is visible if there any words selected which don't have a corresponding card for it. When user selects a region and word without cards are detected the button should appear. This button will for each recognized word call the newly created endpoint for batch card creation. batch card creation flow ignores words which already have a card.

Also I want a close tracking possibility on UI for each card creation step which involves some AI call.
In case batch porcess starts a modal dialog appears with angular material progress indicator for each card. Next to each process indicator I want to see a text about the progress. For this we need to have a streaming response of JSONs from API.

On API level only single card creation should be supported. The UI is responsible for calling this endpoint in parallel.

>>>

Now the card creation happens manually clicking on a word. I want a possibility to do it in bulk. So I can select multiple regions (already supported). If there is any word which doesn't have a card I want to see a nice hovering material CTA button in right bottom corner to create the cards in batch. The button should show how much card to be created. Please analkyze what steps are done to collect all card information. And based on that implement a single service which does the bulk card creation. each process step should run in parallel for improved performance.

on page route create a angular material floating button which is visible if there any words selected which don't have a corresponding card for it. When user selects a region and word without cards are detected the button should appear. This button will for each recognized word call the newly created endpoint for batch card creation. batch card creation flow ignores words which already have a card.

Also I want a close tracking possibility on UI for each card creation step which involves some AI call.
In case batch porcess starts a modal dialog appears with angular material progress indicator for each card. Next to each process indicator I want to see a text about the progress. 
