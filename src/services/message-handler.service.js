const Composer = require('telegraf/composer');
const { getSafe } = require('../utils/get-safe');
const { botTexts } = require('../bot-text');

class MessageHandlerService {
  constructor(apiService) {
    this.apiService = apiService;
  }

  botUseHandler(ctx) {
    if (getSafe(() => ctx.update.message.text === '/create' && ctx.update.callback_query.data === 'create')) {
      ctx.replyWithMarkdown(botTexts.createCaseText);
      return ctx.wizard.selectStep(2);
    }

    ctx.replyWithMarkdown(
      botTexts.greetingsText,
      {
        reply_markup: {
          one_time_keyboard: true,
          inline_keyboard: [
            [
              { text: botTexts.helpButtonText, callback_data: 'help' },
              { text: botTexts.declineButtonText, callback_data: 'cancel' },
            ],
            [{ text: botTexts.createCaseButtonText, callback_data: 'create' }],
          ],
        },
      },
    );
    return ctx.wizard.next();
  }

  createCaseComposer() {
    const createCaseHandler = new Composer();
    createCaseHandler.command('create', (ctx) => this.createCase(ctx));
    createCaseHandler.action('create', (ctx) => this.createCase(ctx));

    return createCaseHandler;
  }

  createCase(ctx) {
    ctx.replyWithMarkdown(botTexts.createCaseText);
    return ctx.wizard.next();
  }

  textComposer() {
    const textHandler = new Composer();
    textHandler.on('text', (ctx) => {
      ctx.wizard.state.data = {};
      const details = ctx.update.message.text;
      ctx.wizard.state.data.details = details;
      ctx.reply(botTexts.photoRequestText);
      return ctx.wizard.next();
    });
    textHandler.use((ctx) => ctx.reply(botTexts.forceTextRequest));

    return textHandler;
  }

  photoComposer() {
    const photoHandler = new Composer();
    photoHandler.on('photo', async (ctx) => {
      const photosList = ctx.update.message.photo;
      const lastPhoto = photosList.length - 1;
      const biggestPhoto = photosList[lastPhoto];

      const url = await ctx.telegram.getFileLink(biggestPhoto);

      ctx.wizard.state.data.image_url = url;

      ctx.reply(botTexts.locationRequestText, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: botTexts.locationRequestButtonText, request_location: true }]],
        },
      });
      return ctx.wizard.next();
    });
    photoHandler.use((ctx) => ctx.reply(botTexts.forcePhotoRequestText));

    return photoHandler;
  }

  locationComposer() {
    const locationHandler = new Composer();
    locationHandler.on('location', async (ctx) => {
      const { location } = ctx.update.message;
      const createdCase = ctx.wizard.state.data;
      ctx.wizard.state.data.location = location;

      await ctx.replyWithPhoto(
        { url: createdCase.image_url },
        {
          caption: `${createdCase.details} \n\n\n\n${botTexts.caseVerificationText}`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: botTexts.caseApproveButtonText, callback_data: 'approved' },
                { text: botTexts.caseDeclineButtonText, callback_data: 'declined' },
              ],
            ],
          },
        },
      );
      return ctx.wizard.next();
    });
    locationHandler.use((ctx) => ctx.reply(botTexts.forceLocationRequestText));

    return locationHandler;
  }

  validateCaseComposer() {
    const validateHandler = new Composer();
    validateHandler.action('approved', (ctx) => {
      const createdCase = ctx.wizard.state.data;
      ctx.telegram.sendChatAction(ctx.update.callback_query.message.chat.id, 'upload_document');
      this.apiService
        .sendCase(createdCase)
        .then(() => ctx.reply(botTexts.caseApprovedText))
        .catch(() => ctx.reply(botTexts.caseErrorText));
      ctx.editMessageReplyMarkup({});
      return ctx.scene.leave();
    });
    validateHandler.action('declined', (ctx) => {
      ctx.editMessageReplyMarkup({});
      ctx.reply(botTexts.caseDeclinedText);
      return ctx.scene.leave();
    });

    return validateHandler;
  }

  cancelHandler(ctx) {
    if (ctx.update.callback_query) {
      ctx.editMessageReplyMarkup({});
    }

    ctx.reply(botTexts.cancelButtonAnswerText);
    ctx.session = null;
    ctx.scene.leave('case-creator');
  }

  helpHandler(ctx) {
    ctx.replyWithMarkdown(botTexts.helpButtonAnswerText);
  }
}

module.exports = {
  MessageHandlerService,
};