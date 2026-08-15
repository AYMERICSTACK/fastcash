export function formatCHF(value:number){return new Intl.NumberFormat("fr-CH",{style:"currency",currency:"CHF"}).format(value)}
export function slugify(input:string){return input.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," et ").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}
