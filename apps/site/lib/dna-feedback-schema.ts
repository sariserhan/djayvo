export const likedTags={groove:'Groove',vocals:'Singing',lyrics:'Lyrics',energy:'Energy',variety:'Variety',ending:'Ending',language:'Language',style:'Style match'};
export const issueTags={too_slow:'Too slow',too_fast:'Too fast',too_soft:'Too soft',too_harsh:'Too harsh',robotic_vocals:'Robotic singing',unclear_words:'Unclear words',repetitive:'Too repetitive',abrupt_ending:'Abrupt ending',wrong_language:'Wrong language',wrong_style:'Wrong style'};
export type DnaFeedback={rating:'like'|'dislike';tags:string[];personalize:boolean;trainingConsent:boolean};
export function validateFeedback(value:unknown):DnaFeedback{
 if(!value||typeof value!=='object')throw Error('Invalid feedback');const f=value as DnaFeedback;
 if(!['like','dislike'].includes(f.rating)||!Array.isArray(f.tags)||f.tags.length>6||new Set(f.tags).size!==f.tags.length||f.tags.some(t=>typeof t!=='string'||!Object.hasOwn(f.rating==='like'?likedTags:issueTags,t))||typeof f.personalize!=='boolean'||typeof f.trainingConsent!=='boolean')throw Error('Invalid feedback');
 return {rating:f.rating,tags:[...f.tags],personalize:f.personalize,trainingConsent:f.trainingConsent};
}
