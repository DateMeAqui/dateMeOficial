
export class CalculateDateBrazilNow {

    // Calcule data local brasil
    brazilDate(){
        const now = new Date();
        return new Date(now.getTime() - 3 * 60 * 60 * 1000); // UTC-3 (subtract 3 hours in milliseconds)
    }

}