export const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

export const ErrorFn = (text, err) => {
    if (err instanceof Error) {
        console.error(text, err.message)
    } else {
        console.error(`${text}. Неизвестная`, err)
    }

    return false
}