import { Scenes } from "telegraf";
import { editAge, editGender, editGenderSearch, editName, EditProfile, PremiumScene, Profile, Statistic } from "./handlers/profile/profileScene";
import { Start } from "./handlers/start/startScene";
import { gemsScenes, sendGemsCustom } from "./handlers/gems/get";
import { Connect } from "./handlers/connect/get";
import { Register, RegisterRefresh } from "./handlers/register/registerScenes";
import { TalkSearch } from "./handlers/search/talk";
import { FlirtSearch } from "./handlers/search/flirt";

export interface MyContext extends Scenes.WizardContext {
    session: any
}

export const stage = new Scenes.Stage<MyContext>([]);

stage.register(Start);
stage.register(Register);
stage.register(Profile);
stage.register(Connect);
stage.register(EditProfile);
stage.register(editName);
stage.register(editAge);
stage.register(editGender);
stage.register(editGenderSearch);
stage.register(Statistic);
stage.register(PremiumScene);
stage.register(RegisterRefresh);
stage.register(gemsScenes);
stage.register(sendGemsCustom);
stage.register(TalkSearch);
stage.register(FlirtSearch);