'use server'

import { auth } from "@clerk/nextjs/server"
import { createSupabaseClient } from "../supabase"

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth()
    const supabase = createSupabaseClient()

    const { data, error } = await supabase.from('companions').insert({ ...formData, author }).select()

    if (error || !data) throw new Error(error?.message || 'Failed to create a companion');

    return data[0];

}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient() // Llamamos al database

    let query = supabase.from('companions').select()

    if (subject && topic) {
        query = query.ilike('subject', `%${subject}%`).or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    } else if (subject) {
        query = query.ilike('subject', `%${subject}%`)
    } else if (topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    }

    // page 8 elements => 9
    query = query.range((page - 1) * limit, page * limit - 1)

    const { data: companions, error } = await query

    if (error) throw new Error(error.message);

    return companions
}

export const getCompanion = async (id: string) => {
    const supabase = createSupabaseClient()

    const { data, error } = await supabase.from('companions').select().eq('id', id)

    if (error) return console.log(error);

    return data[0]
}

export const addToSessionHistory = async (companionId: string) => {
    const { userId } = await auth();
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.from('session_history').insert({
        companion_id: companionId,
        user_id: userId
    })

    if (error) throw new Error(error.message);

    return data;
}

export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient()

    //Seleccionamos en companions todos los companion_id que haya en session_history (y sus datos) en orden del mas reciente al mas viejo
    const { data, error } = await supabase.from('session_history').select(`companions:companion_id (*)`).order('created_at', { ascending: false }).limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions)
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient()

    //Seleccionamos de companions la columna con el id que mandamos y todo lo que contenga
    const { data, error } = await supabase.from('session_history').select(`companions:companion_id (*)`).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)

    if (error) throw new Error(error.message);

    return data.map(({ companions }) => companions)
}

export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient()

    //Seleccionamos de companions la columna con el id que mandamos y todo lo que contenga
    const { data, error } = await supabase.from('companions').select().eq('author', userId)

    if (error) throw new Error(error.message);

    return data;
}